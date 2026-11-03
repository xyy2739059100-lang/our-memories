/**
 * 旅行地图的数据模型（阶段七）。
 * 城市 / 旅行 / 地点 / 照片四张独立的表，只靠 id 互相关联，
 * 以后换成云端数据库时，页面代码不用改。
 */

/** 两位共同编辑的人 */
export type AuthorId = "me" | "her";

export interface TravelPhoto {
  id: string;
  /** 公共素材路径，或用户上传后的 dataURL */
  src: string;
  width: number;
  height: number;
  caption?: string;
  /** YYYY.MM.DD */
  takenAt?: string;
  /** 属于哪个地点 */
  spotId?: string;
  /** 谁拍的 */
  authorId: AuthorId;
}

export interface TravelCity {
  id: string;
  name: string;
  region?: string;
  /** [纬度, 经度] */
  center: [number, number];
  /** 点开城市后飞到这一级 */
  defaultZoom: number;
  slogan?: string;
}

export interface TravelSpot {
  id: string;
  cityId: string;
  tripId: string;
  name: string;
  lat: number;
  lng: number;
  kind: "scenic" | "food" | "stay" | "other";
  /** 一行手写小记 */
  note: string;
  /** YYYY.MM.DD */
  visitedAt: string;
  /** 同一次旅行里的游览顺序 */
  order: number;
  photoIds: string[];
  authorId: AuthorId;
}

export interface TravelTrip {
  id: string;
  title: string;
  cityId: string;
  /** YYYY.MM.DD */
  startDate: string;
  endDate: string;
  /** 详情卡上的一两句 */
  summary: string;
  /** 旅行日记 / 感受 */
  journal: string;
  spotIds: string[];
  /** 详情卡上叠放的照片 */
  coverPhotoIds: string[];
  participants: AuthorId[];
  updatedAt: string;
  updatedBy: AuthorId;
}

/**
 * 自己导入的底图：把一张图片铺在地图的某块经纬度范围上。
 * 没有在线瓦片，导入后就当手绘纸用，城市 / 地点标记照旧叠在上面。
 */
export interface TravelMapImage {
  src: string;
  width: number;
  height: number;
  /** 图片四角对应的经纬度范围 */
  bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  /** 原始文件名，设置面板里显示用 */
  label?: string;
}

export interface TravelData {
  cities: TravelCity[];
  trips: TravelTrip[];
  spots: TravelSpot[];
  photos: TravelPhoto[];
  /** 用户自己导入的底图；为空时用手绘水彩底图 */
  mapImage?: TravelMapImage | null;
}

/** 两位的共同资料，卡片上显示头像和小署名 */
export const AUTHORS: Record<
  AuthorId,
  { name: string; short: string; color: string }
> = {
  me: { name: "我", short: "我", color: "#8ea9bd" },
  her: { name: "她", short: "她", color: "#c98b78" },
};
