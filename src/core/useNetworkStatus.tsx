import {useEffect, useState} from "react";
import {Network} from "@capacitor/network";


export const useNetwork = () => {
    const [status, setStatus] = useState(false);

    useEffect(() => {

        Network.getStatus().then(status => setStatus(status.connected))

        const handler = Network.addListener('networkStatusChange', status => {
            setStatus(status.connected)
        })

        return () => {
            handler.remove();
        }

    }, []);

    return { status };
}