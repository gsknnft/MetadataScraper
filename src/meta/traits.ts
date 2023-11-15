// traits.ts

export interface Songs {
  songs: string[];
}

export interface Song {
  song: string;
}

export interface Frame {
  color: string;
}

export interface Frames {
  color: string[];
}

export const songsData: Songs = {
  songs: [
    `Midwest Boy`,
    'Im Gonna Love You',
    `Daddy's Head Hurts`,
    `Jim Bristol`,
    `Corner Tap`,
  ],
};

export const framesData: Frames = {
  color: ['Red', `Green`, `Purple`, `Silver`, `Gold`],
};

export enum TraitType {
  Song = 'Song',
  Frame = 'Frame',
}

export enum SongTrait {
  MidwestBoy = 'Midwest Boy',
  ImGonnaLoveYou = 'Im Gonna Love You',
  DaddysHeadHurts = "Daddy's Head Hurts",
  JimBristol = 'Jim Bristol',
  CornerTap = 'Corner Tap',
}

export enum FrameTrait {
  Red = 'Red',
  Green = 'Green',
  Purple = 'Purple',
  Silver = 'Silver',
  Gold = 'Gold',
}