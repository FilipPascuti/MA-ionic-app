import {useCamera} from '@capacitor-community/camera-react';
import {Photo as CameraPhoto, CameraResultType, CameraSource} from '@capacitor/camera';
import {Directory as FilesystemDirectory} from '@capacitor/filesystem';
import {useEffect, useState} from 'react';
import {base64FromPath, useFilesystem} from '@capacitor-community/filesystem-react';
import {useStorage} from '@capacitor-community/storage-react';


export interface Photo {
    filepath: string;
    webviewPath?: string;
}

const PHOTO_STORAGE = 'photos';

export function usePhotoGallery() {
    const { getPhoto } = useCamera();
    const [photos, setPhotos] = useState<Photo[]>([]);

    const takePhoto = async () => {
        try {
            const cameraPhoto = await getPhoto({
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera,
                quality: 100
            });
            const fileName = new Date().getTime() + '.jpeg';
            const savedFileImage = await savePicture(cameraPhoto, fileName);
            const newPhotos = [savedFileImage, ...photos];
            setPhotos(newPhotos);
            set(PHOTO_STORAGE, JSON.stringify(newPhotos));
            return savedFileImage.webviewPath;
        } catch (error) {
            return '';
        }

    };

    const { deleteFile, readFile, writeFile } = useFilesystem();
    const savePicture = async (photo: CameraPhoto, fileName: string): Promise<Photo> => {
        const base64Data = await base64FromPath(photo.webPath!);
        await writeFile({
            path: fileName,
            data: base64Data,
            directory: FilesystemDirectory.Data,
            recursive: true
        });

        return {
            filepath: fileName,
            webviewPath: base64Data
        };
    };

    const { get, set } = useStorage();
    useEffect(() => {
        const loadSaved = async () => {
            const photosString = await get(PHOTO_STORAGE);
            const photos = (photosString ? JSON.parse(photosString) : []) as Photo[];
            for (let photo of photos) {
                try {
                    const file = await readFile({
                        path: photo.filepath,
                        directory: FilesystemDirectory.Data
                    });
                    photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
                } catch (error) {
                    setPhotos([]);
                    return;
                }

            }
            setPhotos(photos);
        };
        loadSaved();
    }, [get, readFile]);

    const deletePhoto = async (photo: Photo) => {
        const newPhotos = photos.filter(p => p.filepath !== photo.filepath);
        set(PHOTO_STORAGE, JSON.stringify(newPhotos));
        const filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1);
        await deleteFile({
            path: filename,
            directory: FilesystemDirectory.Data
        });
        setPhotos(newPhotos);
    };

    async function readAsBase64(cameraPhoto: CameraPhoto) {
        // Fetch the photo, read as a blob, then convert to base64 format
        const response = await fetch(cameraPhoto.webPath!);
        const blob = await response.blob();

        return await convertBlobToBase64(blob) as string;
    }

    const  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
        const reader = new FileReader;
        reader.onerror = reject;
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.readAsDataURL(blob);
    });

    return {
        photos: photos,
        takePhoto: takePhoto,
        deletePhoto: deletePhoto
    };
}