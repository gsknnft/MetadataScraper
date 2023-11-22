// traits.ts


export interface Traits {
  frame: FrameTrait;
  song: SongTrait
}

export interface TraitsData {
  [TraitType.Song]: string[];
  [TraitType.Frame]: string[];
}

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

export const songsDataSet: Songs = {
  songs: [
    `Midwest Boy`,
    'Im Gonna Love You',
    `Daddy's Head Hurts`,
    `Jim Bristol`,
    `Corner Tap`,
  ],
};

export const framesDataSet: Frames = {
  color: [
    'Red',
    `Green`,
    `Purple`,
    `Blue`,
    `Silver`,
    `Gold`
  ],
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

export const framesData: Frames = {
  color: Object.values(FrameTrait),
};


export const songsData: Songs = {
  songs: Object.values(SongTrait),
};


export const frameEqualizer: Record<string, string> = {
  "Daddy's Colors": "Frame",
  "Colors": "Frame",
  "Frame": "Frame",
};