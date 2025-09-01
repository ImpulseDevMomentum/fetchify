interface Track {
    id: string;
    title: string;
    artist: string;
    album?: string;
    podcast?: string;
    duration: number;
    added_at: string;
    image_url?: string;
    spotify_url?: string;
}

export default Track;