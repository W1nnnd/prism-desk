export interface Palette {
  base: number;
  tile: number;
  wall: number;
  room: number;
  emitter: number;
  beam: number;
  mirror: number;
  pad: number;
  targetOff: number;
  targetOn: number;
  hint: number;
  ui: number;
  uiActive: number;
  text: string;
  textBg: string;
}

export const NORMAL: Palette = {
  base: 0x101624,
  tile: 0x1c2538,
  wall: 0x46506a,
  room: 0x6f8cff,
  emitter: 0xffb347,
  beam: 0xffe27a,
  mirror: 0xa8dcff,
  pad: 0x26365a,
  targetOff: 0x40507a,
  targetOn: 0x7affc9,
  hint: 0xff7ad9,
  ui: 0x22304a,
  uiActive: 0x3c6df0,
  text: '#eaf2ff',
  textBg: 'rgba(14,20,34,0.88)',
};

/** High contrast: black/white structure, yellow light, green success, magenta hint (colour-blind safe pairs). */
export const HIGH_CONTRAST: Palette = {
  base: 0x000000,
  tile: 0x161616,
  wall: 0xffffff,
  room: 0x00b7ff,
  emitter: 0xffffff,
  beam: 0xffd400,
  mirror: 0xffffff,
  pad: 0x444444,
  targetOff: 0x777777,
  targetOn: 0x00ff66,
  hint: 0xff00ff,
  ui: 0x000000,
  uiActive: 0xffd400,
  text: '#ffffff',
  textBg: 'rgba(0,0,0,1)',
};
