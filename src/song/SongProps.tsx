export interface SongProps {
    _id?: string;
    text: string;
    length: number;
    date: string;
    liked: boolean;
//    camera attributes
    webViewPath: string
//    location attributes
    latitude?: number;
    longitude?: number;
}
