import {getLogger} from "../core";
import {SongProps} from "./SongProps";
import React, {ReactPropTypes, useCallback, useContext, useEffect, useReducer, useRef, useState} from "react";
import PropTypes from 'prop-types';
import {createSong, getSongs, newWebSocket, syncData, updateSong} from "./SongApi";
import {AuthContext} from "../auth";
import {useNetwork} from "../core/useNetworkStatus";
import {Network} from "@capacitor/network";
import {Storage} from "@capacitor/storage";

const logger = getLogger("SongProvider");

type SaveSongFunction = (song: SongProps) => Promise<any>;

export interface SongsState {
    songs?: SongProps[];
    fetching: boolean,
    fetchingError?: Error | null,
    saving: boolean,
    savingError?: Error | null,
    saveSong?: SaveSongFunction,
    savedOffline?: boolean,
    setSavedOffline?: Function
}

interface ActionProps {
    type: string,
    payload?: any
}

const initialState = {
    fetching: false,
    saving: false
}

const FETCH_SONGS_STARTED = "FETCH_SONGS_STARTED";
const FETCH_SONGS_SUCCEEDED = "FETCH_SONGS_SUCCEEDED";
const FETCH_SONGS_FAILED = "FETCH_SONGS_FAILED";
const SAVE_SONG_STARTED = "SAVE_SONG_STARTED";
const SAVE_SONG_SUCCEEDED = "SAVE_SONG_SUCCEEDED";
const SAVE_SONG_FAILED = "SAVE_SONG_FAILED";

const reducer: (state: SongsState, action: ActionProps) => SongsState =
    (state: SongsState, {type, payload}: ActionProps) => {
        switch(type) {
            case FETCH_SONGS_STARTED:
                return {...state, fetching: true, fetchingError: null}
            case FETCH_SONGS_SUCCEEDED:
                return {...state, fetching: false, songs: payload.songs}
            case FETCH_SONGS_FAILED:
                return {...state, fetching: false, fetchingError: payload.error}
            case SAVE_SONG_STARTED:
                return {...state, saving: true, savingError: null}
            case SAVE_SONG_SUCCEEDED:
                // if (payload.song._id == undefined)
                //     return state
                const songs = [...(state.songs || [])]
                const song = payload.song;
                const index = songs.findIndex(sg => song._id === sg._id);
                if (index === -1){
                    songs.splice(0, 0, song);
                } else {
                    songs[index] = song
                }
                return {...state, songs, saving: false}
            case SAVE_SONG_FAILED:
                return {...state, saving: false, savingError: payload.error}
            default:
                return state;
        }
    };

export const SongContext = React.createContext<SongsState>(initialState);

interface SongProviderProps {
    children: PropTypes.ReactNodeLike;
}

export const SongProvider: React.FC<SongProviderProps> = ({children}) => {
    const { token } = useContext(AuthContext);
    const { status } = useNetwork();
    const [state, dispatch] = useReducer(reducer, initialState);
    const {songs, fetching, fetchingError, saving, savingError} = state;

    const [savedOffline, setSavedOffline] = useState(false);


    useEffect(getSongsEffect, [token]);
    useEffect(wsEffect, [token]);
    useEffect(() => {
        console.log("sync data effect !!!!!!!!!!")
        const effect = async () => {
            if (status && savedOffline) {
                console.log("syncing !!!!!!!!!!!")
                await syncData(token)
                getSongsEffect()
                setSavedOffline(false)
            }
        }
        effect()

    }, [status, savedOffline])

    useEffect(() => {
        console.log("!!!!!!!!savedOffline state changed", savedOffline)
    }, [savedOffline])

    const saveSong = useCallback<SaveSongFunction>(saveSongCallback, [token, status]);
    const value = {
        songs,
        fetching,
        fetchingError,
        saving,
        savingError,
        saveSong,
        savedOffline,
        setSavedOffline
    };

    return (
        <SongContext.Provider value={value}>
            {children}
        </SongContext.Provider>
    );

    function getSongsEffect() {
        let canceled = false;
        fetchSongs();
        return () => {
            canceled = true;
        }

        async function fetchSongs() {
            if(!token?.trim()){
                return;
            }
            if (status) {
                console.log("fetching online")
                try {
                    logger("fetching started");
                    dispatch({type: FETCH_SONGS_STARTED});
                    const songs = await getSongs(token);
                    logger("fetchSongs succeeded");
                    logger(songs);
                    console.log(typeof songs)
                    if (!canceled) {
                        dispatch({type: FETCH_SONGS_SUCCEEDED, payload: {songs}});
                    }
                } catch (error) {
                    logger('fetchSongs failed');
                }
            } else {
                console.log("fetching offline")
                const keys = (await Storage.keys()).keys;
                const songs: SongProps[] = [];
                for (let i = 0; i < keys.length; i++){
                    const key = keys[i];
                    if (key !== "token") {
                        const song = await Storage.get({key})
                        if (song.value != null){
                                songs.push(JSON.parse(song.value))
                            }
                    }
                }
                logger(songs);
                dispatch({type: FETCH_SONGS_SUCCEEDED, payload: { songs } });
            }
        }
    }

    async function saveSongCallback(song: SongProps) {
        try{
            if (status) {
                logger("saveSong started");
                dispatch({type: SAVE_SONG_STARTED});
                const savedSong = await (song._id ? updateSong(token, song) : createSong(token, song));
                logger("saveSong succeeded");
                dispatch({type: SAVE_SONG_SUCCEEDED, payload: {song: savedSong}});
            } else {
                logger("save song offline");
                song._id = (song._id == undefined) ? ('_' + Math.random().toString(36).substr(2, 16)) : song._id;
                await Storage.set({
                    key: song._id,
                    value: JSON.stringify({
                        _id: song._id,
                        text: song.text,
                        length: song.length,
                        liked: song.liked,
                        date: song.date,
                        webViewPath: song.webViewPath,
                        latitude: song.latitude,
                        longitude: song.longitude
                    })
                })
                dispatch({type: SAVE_SONG_SUCCEEDED, payload: { song }})
                setSavedOffline(true);
            }
        } catch (error) {
            logger("saveSong failed");
            await Storage.set({
                key: String(song._id),
                value: JSON.stringify(song)
            })
            dispatch({type: SAVE_SONG_SUCCEEDED, payload: { song }})
            setSavedOffline(true);
        }
    }

    function wsEffect() {
        let canceled = false;
        logger('wsEffect - connectiog');
        let closeWebSocket: () => void;
        if (token?.trim()) {
            closeWebSocket = newWebSocket(token, message => {
                if(canceled) {
                    return;
                }
                const {type, payload: song} = message;
                logger(`ws message, item ${type}`);
                if (type === 'created' || type === 'updated') {
                    console.log("wswswswswswswsw =====", song)
                    dispatch({type: SAVE_SONG_SUCCEEDED, payload: {song}})
                }
            })
        }
        return () => {
            logger('wsEffect = disconnecting');
            canceled = true;
            closeWebSocket?.();
        }
    }
};



































