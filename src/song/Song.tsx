import React, {useEffect, useState} from 'react';
import {SongProps} from "./SongProps";
import {createAnimation, IonItem, IonLabel, IonModal} from "@ionic/react";

interface SongPropsExtended extends SongProps {
    onEdit: (_id?: string) => void;
}

const Song:React.FC<SongPropsExtended> = ({_id, text, onEdit, webViewPath}) => {

    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        document.getElementById("image")!.addEventListener('mouseenter', () => {
            setShowModal(true);
        });
    }, [document.getElementById("image")]);

    useEffect(() => {
        document.getElementById("item")!.addEventListener('click', () => {
            onEdit(_id);
        });
    }, [document.getElementById("item")]);

    const enterAnimation = (baseEl: any) => {

        const backdropAnimation = createAnimation()
            .addElement(baseEl.querySelector('ion-backdrop')!)
            .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');

        const wrapperAnimation = createAnimation()
            .addElement(baseEl.querySelector('.modal-wrapper')!)
            .keyframes([
                { offset: 0, opacity: '0', transform: 'scale(0)' },
                { offset: 1, opacity: '0.99', transform: 'scale(1)' }
            ]);

        return createAnimation()
            .addElement(baseEl)
            .easing('ease-out')
            .duration(500)
            .addAnimation([backdropAnimation, wrapperAnimation]);
    }

    const leaveAnimation = (baseEl: any) => {
        return enterAnimation(baseEl).direction('reverse');
    }

    return (
        <IonItem id="item" onClick={() => onEdit(_id)}>
            <IonLabel>{text}</IonLabel>

            {webViewPath && (<img id="image" src={webViewPath} width={'100px'} height={'100px'} onClick={() => {
                setShowModal(true);
            }} />)}

            <IonModal isOpen={showModal} enterAnimation={enterAnimation} leaveAnimation={leaveAnimation} backdropDismiss={true} onDidDismiss={() => setShowModal(false)}>
                <img id="image" src={webViewPath} />
            </IonModal>

        </IonItem>
    );
};

export default Song;
