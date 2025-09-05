import Track from "./track";
import User from "./user";

/**
 
Copyright (c) 2025 thximpulse

This software is provided for personal and commercial use AS IS, with the following conditions:

You are allowed to use this code in your own projects and run it on your servers.
You are NOT allowed to modify, alter, or create derivative works based on this code.
You are NOT allowed to remove this copyright notice or claim this code as your own.
Redistribution of modified versions is strictly forbidden.
The software is provided "AS IS", without warranty of any kind. 
The authors are not responsible for any damage, loss, or issues caused by the use of this software.
*/

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