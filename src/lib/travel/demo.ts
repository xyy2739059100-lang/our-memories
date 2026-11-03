/**
 * 演示用的旅行数据：6 座城市、6 次旅行、18 个地点。
 * 经纬度取城市 / 景点的真实大致位置，底图是手绘水彩纸，不做精确测绘。
 */
import type {
  TravelCity,
  TravelData,
  TravelPhoto,
  TravelSpot,
  TravelTrip,
} from "./types";

const photo = (
  id: string,
  src: string,
  width: number,
  height: number,
  authorId: TravelPhoto["authorId"],
  caption: string,
  takenAt: string,
): TravelPhoto => ({ id, src, width, height, authorId, caption, takenAt });

export const demoPhotos: TravelPhoto[] = [
  photo("ph-suzhou-1", "/images/memories/city-dusk.svg", 320, 240, "her", "平江路的傍晚", "2026.10.24"),
  photo("ph-suzhou-2", "/images/memories/rose.svg", 320, 240, "me", "窗台上的一枝玫瑰", "2026.10.24"),
  photo("ph-suzhou-3", "/images/memories/cloud-flight.svg", 320, 240, "her", "雨停后的云", "2026.10.25"),
  photo("ph-hangzhou-1", "/images/memories/mountain-lake.svg", 320, 240, "me", "雨里的西湖", "2025.03.21"),
  photo("ph-hangzhou-2", "/images/journal/photo-cloud.png", 240, 256, "her", "灵隐寺外的云", "2025.03.22"),
  photo("ph-xiamen-1", "/images/memories/seaside.svg", 320, 240, "her", "鼓浪屿的海", "2025.06.19"),
  photo("ph-xiamen-2", "/images/journal/photo-beach.png", 218, 223, "me", "环岛路的沙滩", "2025.06.20"),
  photo("ph-chengdu-1", "/images/memories/starry-night.svg", 320, 240, "me", "玉林路的夜", "2025.09.30"),
  photo("ph-chengdu-2", "/images/journal/photo-lake.png", 311, 254, "her", "望江楼的影子", "2025.10.01"),
  photo("ph-dali-1", "/images/journal/photo-lake.png", 311, 254, "her", "洱海的风", "2024.08.12"),
  photo("ph-dali-2", "/images/memories/cloud-flight.svg", 320, 240, "me", "双廊上空的云", "2024.08.13"),
  photo("ph-qingdao-1", "/images/journal/photo-beach.png", 218, 223, "me", "小麦岛的日落", "2024.10.02"),
  photo("ph-qingdao-2", "/images/memories/seaside.svg", 320, 240, "her", "栈桥边的海鸥", "2024.10.03"),
];

export const demoCities: TravelCity[] = [
  {
    id: "city-suzhou",
    name: "苏州",
    region: "江苏",
    center: [31.322, 120.619],
    defaultZoom: 12.3,
    slogan: "把整座城走成了水墨画",
  },
  {
    id: "city-hangzhou",
    name: "杭州",
    region: "浙江",
    center: [30.236, 120.119],
    defaultZoom: 12.1,
    slogan: "春天的湖，怎么走都不腻",
  },
  {
    id: "city-xiamen",
    name: "厦门",
    region: "福建",
    center: [24.442, 118.089],
    defaultZoom: 11.9,
    slogan: "海风把小巷吹得很慢",
  },
  {
    id: "city-chengdu",
    name: "成都",
    region: "四川",
    center: [30.643, 104.069],
    defaultZoom: 11.8,
    slogan: "一下午只做了一件事：发呆",
  },
  {
    id: "city-dali",
    name: "大理",
    region: "云南",
    center: [25.844, 100.17],
    defaultZoom: 11.4,
    slogan: "风把头发吹得乱七八糟",
  },
  {
    id: "city-qingdao",
    name: "青岛",
    region: "山东",
    center: [36.058, 120.362],
    defaultZoom: 11.9,
    slogan: "一场很慢的日落",
  },
];

const spot = (
  id: string,
  cityId: string,
  tripId: string,
  name: string,
  lat: number,
  lng: number,
  kind: TravelSpot["kind"],
  note: string,
  visitedAt: string,
  order: number,
  photoIds: string[],
  authorId: TravelSpot["authorId"],
): TravelSpot => ({
  id,
  cityId,
  tripId,
  name,
  lat,
  lng,
  kind,
  note,
  visitedAt,
  order,
  photoIds,
  authorId,
});

export const demoSpots: TravelSpot[] = [
  spot("spot-pingjiang", "city-suzhou", "trip-suzhou", "平江路", 31.314, 120.629, "scenic", "雨点落在青石板上，声音很好听。", "2026.10.24", 1, ["ph-suzhou-1", "ph-suzhou-3"], "her"),
  spot("spot-zhengyuan", "city-suzhou", "trip-suzhou", "拙政园", 31.324, 120.629, "scenic", "荷叶上攒着一层水，像小小的湖。", "2026.10.25", 2, ["ph-suzhou-2"], "me"),
  spot("spot-shantang", "city-suzhou", "trip-suzhou", "山塘街", 31.329, 120.599, "food", "买了桂花糕，边走边吃。", "2026.10.25", 3, [], "her"),

  spot("spot-xihu", "city-hangzhou", "trip-hangzhou", "西湖", 30.246, 120.145, "scenic", "撑一把伞走完了整圈，鞋湿了也不扫兴。", "2025.03.21", 1, ["ph-hangzhou-1"], "me"),
  spot("spot-lingyin", "city-hangzhou", "trip-hangzhou", "灵隐寺", 30.242, 120.101, "scenic", "山里的雾，比香火还安静。", "2025.03.22", 2, ["ph-hangzhou-2"], "her"),
  spot("spot-longjing", "city-hangzhou", "trip-hangzhou", "龙井村", 30.22, 120.111, "food", "喝到了今年第一杯新茶。", "2025.03.22", 3, [], "me"),

  spot("spot-gulangyu", "city-xiamen", "trip-xiamen", "鼓浪屿", 24.447, 118.067, "scenic", "在小巷里迷路，反而撞见最好吃的一家。", "2025.06.19", 1, ["ph-xiamen-1"], "her"),
  spot("spot-shapowei", "city-xiamen", "trip-xiamen", "沙坡尾", 24.438, 118.083, "food", "坐在避风坞边，看船发呆。", "2025.06.20", 2, [], "me"),
  spot("spot-huandao", "city-xiamen", "trip-xiamen", "环岛路", 24.442, 118.118, "scenic", "海风把外套吹得鼓鼓的。", "2025.06.20", 3, ["ph-xiamen-2"], "her"),

  spot("spot-yulin", "city-chengdu", "trip-chengdu", "玉林路", 30.634, 104.061, "other", "小酒馆门口唱了一句就跑调。", "2025.09.30", 1, ["ph-chengdu-1"], "me"),
  spot("spot-kuanzhai", "city-chengdu", "trip-chengdu", "宽窄巷子", 30.669, 104.055, "food", "吃了三碗冰粉，还要再一碗。", "2025.10.01", 2, [], "her"),
  spot("spot-wangjiang", "city-chengdu", "trip-chengdu", "望江楼", 30.626, 104.091, "scenic", "竹影落在水面上，一动也不动。", "2025.10.02", 3, ["ph-chengdu-2"], "me"),

  spot("spot-erhai", "city-dali", "trip-dali", "洱海", 25.75, 100.18, "scenic", "骑着小电驴绕湖，风很大。", "2024.08.12", 1, ["ph-dali-1"], "her"),
  spot("spot-xizhou", "city-dali", "trip-dali", "喜洲", 25.85, 100.13, "food", "吃了喜洲粑粑，甜的比咸的好吃。", "2024.08.13", 2, [], "me"),
  spot("spot-shuanglang", "city-dali", "trip-dali", "双廊", 25.93, 100.2, "stay", "住在海边的客栈，晚上看星星。", "2024.08.13", 3, ["ph-dali-2"], "her"),

  spot("spot-xiaomai", "city-qingdao", "trip-qingdao", "小麦岛", 36.06, 120.416, "scenic", "坐在礁石上看完了一整个日落。", "2024.10.02", 1, ["ph-qingdao-1"], "me"),
  spot("spot-badaguan", "city-qingdao", "trip-qingdao", "八大关", 36.053, 120.352, "scenic", "梧桐叶子开始黄了。", "2024.10.03", 2, [], "her"),
  spot("spot-zhanqiao", "city-qingdao", "trip-qingdao", "栈桥", 36.061, 120.318, "other", "海鸥停在栏杆上，一点也不怕人。", "2024.10.03", 3, ["ph-qingdao-2"], "her"),
];

export const demoTrips: TravelTrip[] = [
  {
    id: "trip-suzhou",
    title: "苏州 · 雨中漫游",
    cityId: "city-suzhou",
    startDate: "2026.10.24",
    endDate: "2026.10.25",
    summary: "在细雨里慢慢走，把整座城走成了水墨画。",
    journal:
      "本来担心下雨会扫兴，结果雨里的苏州反而更像苏州。青石板被洗得发亮，评弹声从窗子里飘出来，我们把伞收了一半，故意走得慢一点。晚上回到客栈，鞋子湿透了，还是觉得值得。",
    spotIds: ["spot-pingjiang", "spot-zhengyuan", "spot-shantang"],
    coverPhotoIds: ["ph-suzhou-1", "ph-suzhou-3"],
    participants: ["me", "her"],
    updatedAt: "2026.10.25",
    updatedBy: "her",
  },
  {
    id: "trip-hangzhou",
    title: "杭州 · 春天的湖",
    cityId: "city-hangzhou",
    startDate: "2025.03.21",
    endDate: "2025.03.22",
    summary: "下着小雨，撑一把伞走完了整圈西湖。",
    journal:
      "三月的杭州还带着凉意。绕湖走了一整天，从断桥走到苏堤，中途在长椅上吃了两个面包。傍晚去灵隐寺，山里的雾把什么都藏起来了。",
    spotIds: ["spot-xihu", "spot-lingyin", "spot-longjing"],
    coverPhotoIds: ["ph-hangzhou-1", "ph-hangzhou-2"],
    participants: ["me", "her"],
    updatedAt: "2025.03.22",
    updatedBy: "me",
  },
  {
    id: "trip-xiamen",
    title: "厦门 · 海风与小巷",
    cityId: "city-xiamen",
    startDate: "2025.06.18",
    endDate: "2025.06.21",
    summary: "在小巷里迷路，在礁石上吹风。",
    journal:
      "鼓浪屿上不许骑车，走路走得很累，但每条巷子都值得拐进去。最惊喜的是在一家没有招牌的小店吃到沙茶面，老板说他们开了二十年。",
    spotIds: ["spot-gulangyu", "spot-shapowei", "spot-huandao"],
    coverPhotoIds: ["ph-xiamen-1", "ph-xiamen-2"],
    participants: ["me", "her"],
    updatedAt: "2025.06.21",
    updatedBy: "her",
  },
  {
    id: "trip-chengdu",
    title: "成都 · 巷子里的茶",
    cityId: "city-chengdu",
    startDate: "2025.09.30",
    endDate: "2025.10.02",
    summary: "每天下午都在同一家茶馆坐着发呆。",
    journal:
      "这趟旅行什么景点都没赶。下午两点准时出门去茶馆，点两杯盖碗茶，坐到天色发黄。晚上去玉林路散步，听见有人弹吉他，我们就站着听完了。",
    spotIds: ["spot-yulin", "spot-kuanzhai", "spot-wangjiang"],
    coverPhotoIds: ["ph-chengdu-1", "ph-chengdu-2"],
    participants: ["me", "her"],
    updatedAt: "2025.10.02",
    updatedBy: "me",
  },
  {
    id: "trip-dali",
    title: "大理 · 绕湖一圈",
    cityId: "city-dali",
    startDate: "2024.08.12",
    endDate: "2024.08.14",
    summary: "骑着小电驴绕湖，晚上在客栈天台看星星。",
    journal:
      "三天里有两天下雨，但我们还是把洱海绕了一圈。最喜欢的时刻是晚上，客栈天台只有我们两个人，星星多得有点不真实。",
    spotIds: ["spot-erhai", "spot-xizhou", "spot-shuanglang"],
    coverPhotoIds: ["ph-dali-1", "ph-dali-2"],
    participants: ["me", "her"],
    updatedAt: "2024.08.14",
    updatedBy: "her",
  },
  {
    id: "trip-qingdao",
    title: "青岛 · 看一场日落",
    cityId: "city-qingdao",
    startDate: "2024.10.02",
    endDate: "2024.10.03",
    summary: "海风有点凉，买了两个烤地瓜暖手。",
    journal:
      "国庆的人很多，但我们找到了小麦岛一块没什么人的礁石。日落从橘色变成深蓝，我们谁都没说话。回去的路上买了烤地瓜，手终于暖和了。",
    spotIds: ["spot-xiaomai", "spot-badaguan", "spot-zhanqiao"],
    coverPhotoIds: ["ph-qingdao-1", "ph-qingdao-2"],
    participants: ["me", "her"],
    updatedAt: "2024.10.03",
    updatedBy: "me",
  },
];

export const demoTravelData: TravelData = {
  cities: demoCities,
  trips: demoTrips,
  spots: demoSpots,
  photos: demoPhotos,
};
