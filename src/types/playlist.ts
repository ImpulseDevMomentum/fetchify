import Track from "./track";
import User from "./user";

export type { Track, User };

interface Playlist {
    id: string;
    name: string;
    description: string;
    owner: User;
    public: boolean; // if the playlist is public (it will always be true tho)
    collaborative: boolean;
    followers: number;
    profile_picture: string;
    tracks: Track[];
    elements: number;
    created_at: string;
    saved_times: number;
    duration: number;
}

export default Playlist;