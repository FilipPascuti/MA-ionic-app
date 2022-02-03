import React, {useContext, useEffect, useState} from 'react';
import {
    IonChip,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel,
    IonList,
    IonLoading,
    IonPage, IonSearchbar, IonSelect, IonSelectOption,
    IonTitle, IonToast,
    IonToolbar
} from "@ionic/react";
import {SongContext} from "./SongProvider";
import {getLogger} from "../core";
import Song from "./Song";
import {RouteComponentProps} from "react-router";
import {add, logOut} from "ionicons/icons";
import {useNetwork} from "../core/useNetworkStatus";
import {AuthContext} from "../auth";
import {SongProps} from "./SongProps";

const logger = getLogger("SongList");
const offset = 5;
const lengths = [0, 60, 120, 180, 240, 300];

const SongList: React.FC<RouteComponentProps> = ({history}) => {
    const { logout } = useContext(AuthContext)
    const {songs, fetching, fetchingError, savedOffline} = useContext(SongContext);
    const {status} = useNetwork();

    //paging part
    const [disableInfiniteScroll, setDisabledInfiniteScroll] = useState<boolean>(false);
    const [visibleSongs, setVisibleSongs] = useState<SongProps[] | undefined>([])
    const [page, setPage] = useState(offset);


    function fetchData() {
        setVisibleSongs(songs?.slice(0, page + offset));
        setPage(page + offset);
        if (songs && page > songs?.length) {
            setDisabledInfiniteScroll(true);
            setPage(songs.length);
        } else {
            setDisabledInfiniteScroll(false);
        }
    }

    async function searchNext($event: CustomEvent<void>) {
        fetchData();
        ($event.target as HTMLIonInfiniteScrollElement).complete();
    }

    useEffect(() => {
        if (songs?.length && songs?.length > 0) {
            setPage(offset);
            fetchData();
            console.log(songs);
        }
    }, [songs])

    //filtering part
    const [filter, setFilter] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (songs && filter) {
            setVisibleSongs(songs.filter(each => each.length >= +filter))
        }
    }, [filter])

    //searching part
    const [search, setSearch] = useState<string>("");

    useEffect(() => {
        if (search === "")
            setVisibleSongs(songs);
        if (songs && search !== "") {
            setVisibleSongs(songs.filter(each => each.text.startsWith(search)));
        }
    }, [search])

    logger("render");

    const handleLogout = () => {
        logger("logout");
        logout?.();
    }

    console.log(songs)

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonItem>
                        <IonTitle>Ionic2</IonTitle>

                        {/*filter part*/}
                        <IonSelect style={{ width: '30%' }} value={filter} placeholder="Pick a minimum length" onIonChange={(e) => setFilter(e.detail.value)}>
                            {lengths.map((each) => (
                                <IonSelectOption key={each} value={each}>
                                    {each}
                                </IonSelectOption>
                            ))}
                        </IonSelect>

                        {/*search part*/}
                        <IonSearchbar style={{ width: '30%' }} placeholder="Search by title" value={search} debounce={200} onIonChange={(e) => {
                            setSearch(e.detail.value!);
                        }}>
                        </IonSearchbar>

                        <IonChip>
                            <IonLabel color={status ? "success" : "danger"}>{status ? "Online" : "Offline"}</IonLabel>
                        </IonChip>
                    </IonItem>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonLoading isOpen={fetching} message="Fetching Songs"/>
                {visibleSongs && (
                    <IonList>
                        {
                            Array.from(visibleSongs)
                                .filter( each => {
                                    if (filter !== undefined)
                                        return each.length >= +filter //&& each._id !== undefined
                                    return true;//each._id !== undefined
                                })
                                .map(({_id, text, length, date, liked, webViewPath, latitude, longitude}) =>
                                <Song key={_id} _id={_id} text={text} length={length} date={date} liked={liked} webViewPath={webViewPath} latitude={latitude} longitude={longitude}
                                      onEdit={id => history.push(`/song/${id}`)}/>
                            )
                        }
                    </IonList>
                )}

                <IonInfiniteScroll threshold="100px" disabled={disableInfiniteScroll} onIonInfinite={(e: CustomEvent<void>) => searchNext(e)}>
                    <IonInfiniteScrollContent loadingText="Loading...">
                    </IonInfiniteScrollContent>
                </IonInfiniteScroll>

                <IonFab vertical="bottom" horizontal="end" slot="fixed">
                    <IonFabButton onClick={() => history.push('/song')}>
                        <IonIcon icon={add}/>
                    </IonFabButton>
                </IonFab>

                <IonFab vertical="bottom" horizontal="start" slot="fixed">
                    <IonFabButton onClick={handleLogout}>
                        <IonIcon icon={logOut}/>
                    </IonFabButton>
                </IonFab>

                {/*<IonToast*/}
                {/*    isOpen={savedOffline ? true : false}*/}
                {/*    message="Your changes will be visible on server when you get back online!"*/}
                {/*    duration={2000}/>*/}
                {savedOffline &&
                    <IonLabel>Items saved offline</IonLabel>
                }
            </IonContent>
        </IonPage>
    );
};

export default SongList;