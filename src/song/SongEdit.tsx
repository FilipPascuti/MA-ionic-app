import React, {useContext, useEffect, useState} from 'react';
import {RouteComponentProps} from "react-router";
import {
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent, IonDatetime,
    IonHeader,
    IonInput, IonItem, IonLabel, IonLoading,
    IonPage,
    IonTitle,
    IonToolbar
} from "@ionic/react";
import {SongContext} from "./SongProvider";
import {SongProps} from "./SongProps";
import {getLogger} from "../core";
import {number} from "prop-types";
import {usePhotoGallery} from "../core/usePhotoGallery";
import {useMyLocation} from "../core/useMyLocation";
import { MyMap } from '../core/MyMap';

const logger = getLogger("songEdit");


interface SongEditProps extends RouteComponentProps<{
    id?: string
}> {
}

const SongEdit: React.FC<SongEditProps> = ({history, match}) => {
    const {songs, saveSong, saving, savingError} = useContext(SongContext);
    const [text, setText] = useState('');
    const [length, setLength] = useState(0);
    const [liked, setLiked] = useState(false);
    const [date, setDate] = useState('2000-01-01');
    const [song, setSong] = useState<SongProps>();

    // photo state
    const [webViewPath, setWebViewPath] = useState('');


    //locaition state
    const [latitude, setLatitude] = useState<number | undefined>(undefined);
    const [longitude, setLongitude] = useState<number | undefined>(undefined);
    const [currentLatitude, setCurrentLatitude] = useState<number | undefined>(undefined);
    const [currentLongitude, setCurrentLongitude] = useState<number | undefined>(undefined);

    const {takePhoto} = usePhotoGallery()

    useEffect( () => {
        logger("in useEffect");
        const routeId = match.params.id || '';
        const song = songs?.find(sg => sg._id === routeId);
        setSong(song);
        if (song) {
            setText(song.text);
            setLength(song.length);
            setLiked(song.liked);
            setDate(song.date);
            setWebViewPath(song.webViewPath);
            setLatitude(song.latitude);
            setLongitude(song.longitude);
        }
        // logger(text + " " + length + " " + liked + " " + date);
    }, [match.params.id, songs] );


    const handleSave = () => {
        const editedSong = song ? {...song, text, length, liked, date, webViewPath, latitude, longitude} : {text, length, liked, date, webViewPath, latitude, longitude};
        logger(editedSong);
        // logger(saveSong);
        saveSong && saveSong(editedSong).then(() => history.goBack());
    }

    async function handlePhotoChange() {
        const image = await takePhoto();
        if (!image) {
            setWebViewPath('');
        } else {
            setWebViewPath(image);
        }
    }

    //location part

    const location = useMyLocation();
    const {latitude : lat, longitude : lng} = location.position?.coords || {};

    useEffect(() => {
        if (latitude === undefined && longitude === undefined) {
            setCurrentLatitude(lat);
            setCurrentLongitude(lng);
        } else {
            setCurrentLatitude(latitude);
            setCurrentLongitude(longitude);
        }
    }, [lat, lng, longitude, latitude]);

    function setLocation() {
        setLatitude(currentLatitude);
        setLongitude(currentLongitude);
        console.log(currentLongitude, currentLatitude)
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Edit</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={handleSave}>
                            Save
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <p>This is the edit page:</p>

                <IonInput type="text" value={text} onIonChange={e => setText(e.detail.value || "")} />
                <IonInput type="number" value={length} onIonChange={e => setLength(parseInt(e.detail.value!, 10))} />

                <IonItem>
                    <IonCheckbox color="dark" checked={liked} slot="start" onIonChange={e => setLiked(e.detail.checked || false)} />
                    <IonLabel>Like song</IonLabel>
                </IonItem>

                <IonItem>
                    <IonLabel>Release Date</IonLabel>
                    <IonDatetime value={date} onIonChange={e => setDate(e.detail.value || "2000-01-01")}/>
                </IonItem>

                <IonItem>
                    <IonLabel>Show us where the song was recorded!</IonLabel>
                    <IonButton onClick={setLocation}>Set location</IonButton>
                </IonItem>


                {webViewPath && (<img onClick={handlePhotoChange} src={webViewPath} width={'100px'} height={'100px'}/>)}
                {!webViewPath && (<img onClick={handlePhotoChange} src={'https://static.thenounproject.com/png/187803-200.png'} width={'100px'} height={'100px'}/>)}

                {lat && lng &&
                <MyMap
                    lat={currentLatitude}
                    lng={currentLongitude}
                    onMapClick={log('onMap')}
                    onMarkerClick={log('onMarker')}
                />
                }

                <IonLoading isOpen={saving}/>
                {savingError && (
                    <div>{savingError.message || 'Failed to save item'}</div>
                )}
            </IonContent>
        </IonPage>
    );

    function log(source: string) {
        return (e: any) => {
            setCurrentLatitude(e.latLng.lat());
            setCurrentLongitude(e.latLng.lng());
            console.log(source, e.latLng.lat(), e.latLng.lng());
        }
    }
};

export default SongEdit;









