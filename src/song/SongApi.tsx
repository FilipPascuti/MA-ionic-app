import {authConfig, baseUrl, config, getLogger, withLogs} from "../core";
import axios from "axios";
import {SongProps} from "./SongProps";
import {Storage} from "@capacitor/storage";

const log = getLogger('songApi');

const songUrl = `http://${baseUrl}/api/song`;

const different = (song1: SongProps, song2: SongProps) => {
    return !(song1._id === song2._id && song1.text === song2.text && song1.length === song2.length && song1.date === song2.date && song1.liked === song2.liked);
}

export const syncData: (token: string) => Promise<SongProps[] | undefined> = async token => {
    try {
        console.log("!!!!!!!!!!!!!!!!!! sync data")
        const {keys} = await Storage.keys();
        const result = axios.get<SongProps[]>(songUrl, authConfig(token))
        const {data} = await result
        result.then(async res => {
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key !== "token") {
                    const songOnServer = data.find(song => song._id === key);
                    const songLocal = (await Storage.get({key})).value

                    console.log("ssssssss song on server: ", songOnServer)
                    console.log("ssssssss song on local st: ", songLocal)
                    if (songOnServer !== undefined)
                        console.log(different(songOnServer, JSON.parse(songLocal!)))

                    if (songOnServer !== undefined && different(songOnServer, JSON.parse(songLocal!))) {
                        log("UPDATE " + songLocal)
                        axios.put<SongProps[]>(`${songUrl}/${key}`, JSON.parse(songLocal!), authConfig(token))
                    } else if (songOnServer == undefined) {
                        log("CREATE " + songLocal)
                        const input = JSON.parse(songLocal!)
                        const songToCreate = {
                            length: input.length,
                            text: input.text,
                            date: input.date,
                            liked: input.liked,
                            webViewPath: input.webViewPath,
                            latitude: input.latitude,
                            longitude: input.longitude
                        }
                        axios.post<SongProps[]>(songUrl, songToCreate, authConfig(token))
                        Storage.remove({key})
                    }
                }
            }
        })
        return withLogs(result, 'syncData')
    } catch (error) {
        console.log(error);
    }
}


export const getSongs: (token: string) => Promise<SongProps[]> = token => {
    const result = axios.get<SongProps[]>(songUrl, authConfig(token))
    result.then(async res => {
            res.data.forEach(song => {
                Storage.set({
                    key: song._id!,
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
            })
        }
    ).catch(error => {
        console.log(error)
    })
    return withLogs(result, "getSongs");
}

export const createSong: (token: string, song: SongProps) => Promise<SongProps[]> = (token, song) => {
    const result = axios.post<SongProps[]>(songUrl, song, authConfig(token))
    result.then(async res => {
            const song: any = res.data;
            console.log("This is the created Song", song)
            await Storage.set({
                key: song._id!,
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
        }
    ).catch(error => {
        console.log(error)
    })
    return withLogs(result, "createSong");
}

export const updateSong: (token: string, song: SongProps) => Promise<SongProps[]> = (token, song) => {
    const result = axios.put<SongProps[]>(`${songUrl}/${song._id}`, song, authConfig(token))
    result.then(async res => {
            const song: any = res.data;
            console.log("This is the updated Song", song)
            await Storage.set({
                key: song._id!,
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
        }
    ).catch(error => {
        console.log(error)
    })
    return withLogs(result, "updateSong");
}

interface MessageData {
    type: string;
    payload: {
        song: SongProps;
    };
}

export const newWebSocket = (token: string, onMessage: (data: MessageData) => void) => {
    const ws = new WebSocket(`ws://${baseUrl}`);
    ws.onopen = () => {
        log('web socket onopen');
        ws.send(JSON.stringify({type: 'authorization', payload: {token}}));
    };
    ws.onclose = () => {
        log("wev socket onclose");
    };
    ws.onerror = error => {
        log('web socket onerror', error);
    };
    ws.onmessage = messageEvent => {
        log('web socket onmessage');
        onMessage(JSON.parse(messageEvent.data));
    };
    return () => {
        ws.close();
    }
}







