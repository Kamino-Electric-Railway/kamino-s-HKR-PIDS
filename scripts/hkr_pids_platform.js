include(Resources.id("jsblock:scripts/pids_util.js"));
const IMG_EMPTY       = "jsblock:textures/pids/1.png";
const IMG_4ARRIVALS   = "jsblock:textures/pids/2.png";
const IMG_ROUTEMAP    = "jsblock:textures/pids/3.png";
const IMG_PLATFORM_CIRCLE = "jsblock:textures/pids/plat_circle.png";
const IMG_ARROW           = "jsblock:textures/pids/arrow.png";

const LANG_PHASE_FRAMES = 120;
const PHASES_PER_VIEW = 4;

const HEADER_OFFSET = 13;
const ROW_SPACING = 16.75;
const TEXT_SCALE = 1.25;

const COL_NUM_X = 2;
const COL_NUM_W = 28;
const COL_DEST_X = 34;
const COL_DEST_W = 30;
const COL_PLAT_X = 80;
const COL_PLAT_W = 12;
const TIME_MAX_W = 30;

function create(ctx, state, pids) {
    state.cycleTimer = 0;
}
function dispose(ctx, state, pids) {}

function render(ctx, state, pids) {
    let arrivals = pids.arrivals();
    let now = Date.now();
    let firstTrain = arrivals.get(0);

    let mode = "normal";
    if (!firstTrain) {
        mode = "empty";
    } else {
        let etaArrive = (firstTrain.arrivalTime() - now) / 1000;
        if (etaArrive > 5400) {
            mode = "empty";
        }
    }

    state.cycleTimer++;
    let totalPhase = Math.floor(state.cycleTimer / LANG_PHASE_FRAMES);
    let currentView = (Math.floor(totalPhase / PHASES_PER_VIEW) % 2 === 0) ? 2 : 3;

    if (mode === "empty") {
        drawImage(ctx, pids, IMG_EMPTY);
        drawWeatherAndClock(ctx, pids);
        drawEmptyNotice(ctx, pids);
        return;
    }

    if (currentView === 2) {
        drawImage(ctx, pids, IMG_4ARRIVALS);
        drawWeatherAndClock(ctx, pids);
        drawFourArrivals(ctx, pids, arrivals, now);
    } else {
        let routemapBg = isNonPassenger(firstTrain, pids) ? "jsblock:textures/pids/6.png" : IMG_ROUTEMAP;
        drawImage(ctx, pids, routemapBg);
        drawWeatherAndClock(ctx, pids);
        drawRouteMapView(ctx, pids, firstTrain, now);
    }
}

function drawWeatherAndClock(ctx, pids) {
    let weatherImg;
    if (MinecraftClient.worldIsThundering()) {
        weatherImg = "jsblock:textures/block/pids/weather_thunder.png";
    } else if (MinecraftClient.worldIsRaining()) {
        weatherImg = "jsblock:textures/block/pids/weather_raining.png";
    } else {
        weatherImg = "jsblock:textures/block/pids/weather_sunny.png";
    }

    Texture.create("Weather Icon")
        .texture(weatherImg)
        .pos(5, 0)
        .size(10, 10)
        .draw(ctx);

    Text.create("Clock")
        .text(PIDSUtil.formatTime(MinecraftClient.worldDayTime(), true))
        .color(0xFFFFFF)
        .pos(pids.width - 5, 2)
        .scale(0.9)
        .rightAlign()
        .draw(ctx);
}

function drawImage(ctx, pids, textureId) {
    Texture.create().texture(textureId).pos(0, 0).size(pids.width, pids.height).draw(ctx);
}

function drawEmptyNotice(ctx, pids) {
    Text.create()
        .text(TextUtil.cycleString("沒有列車服務|No Train Service"))
        .pos(pids.width / 2, pids.height / 2)
        .scale(TEXT_SCALE)
        .centerAlign()
        .color(0x000000)
        .draw(ctx);
}

function drawFourArrivals(ctx, pids, arrivals, now) {
    for (let i = 0; i < 4; i++) {
        let train = arrivals.get(i);
        if (train) {
            let y = HEADER_OFFSET + i * ROW_SPACING;
            drawArrivalRow(ctx, pids, train, y, now);
        }
    }
}

function drawRouteMapView(ctx, pids, train, now) {
    drawArrivalRow(ctx, pids, train, HEADER_OFFSET, now);
    if (isNonPassenger(train, pids)) return;

    let y2 = HEADER_OFFSET + ROW_SPACING;
    Text.create()
        .text(TextUtil.cycleString("本班車將會停靠于|This train will stop at Platform"))
        .pos(2, y2)
        .scale(0.8)
        .color(0x000000)
        .draw(ctx);

    let y3 = HEADER_OFFSET + 2 * ROW_SPACING;
    let y4 = HEADER_OFFSET + 3 * ROW_SPACING;
    let circleY = (y3 + y4) / 2;
    let circleSize = COL_PLAT_W * 2;
    let circleX = pids.width - 4 - 30 - 4 - circleSize;

    Texture.create()
        .texture(IMG_PLATFORM_CIRCLE)
        .color(train.routeColor())
        .pos(circleX, circleY - circleSize / 2)
        .size(circleSize, circleSize)
        .draw(ctx);
    Text.create()
        .text(train.platformName())
        .pos(circleX + circleSize / 2, circleY - 6)
        .centerAlign()
        .scale(1.4)
        .color(0xFFFFFF)
        .draw(ctx);

    Text.create()
        .text(TextUtil.cycleString("號月臺| "))
        .pos(pids.width - 4, y4)
        .rightAlign()
        .scale(TEXT_SCALE)
        .color(0x000000)
        .draw(ctx);
}

function drawArrivalRow(ctx, pids, train, y, now) {
    drawTrainNumber(ctx, pids, train, COL_NUM_X, y);
    drawDestination(ctx, pids, train, COL_DEST_X, y);
    drawPlatformCircle(ctx, train, COL_PLAT_X, y);

    Text.create()
        .text(formatArrivalTime(train.arrivalTime(), now))
        .pos(pids.width - 4, y)
        .size(TIME_MAX_W, 9)
        .stretchXY()
        .rightAlign()
        .scale(TEXT_SCALE)
        .color(0x000000)
        .draw(ctx);
}

function drawTrainNumber(ctx, pids, train, x, y) {
    if (isNonPassenger(train, pids)) return;

    let rawRoute = train.routeNumber();
    let routeNumText = (rawRoute !== null && rawRoute !== undefined) ? String(rawRoute).trim() : "";
    let hasRoute = routeNumText.length > 0;
    let blockColor = getColorByKeyword(routeNumText, train.routeColor());

    Texture.create()
        .texture("mtr:textures/block/white.png")
        .color(blockColor)
        .pos(x, y - 2)
        .size(COL_NUM_W, 13)
        .draw(ctx);

    let displayText;
    if (hasRoute) {
        displayText = routeNumText;
    } else {
        let carCount = train.carCount();
        displayText = carCount + "卡|" + carCount + " cars";
    }
    Text.create()
        .text(TextUtil.cycleString(displayText))
        .pos(x + COL_NUM_W / 2, y + 1)
        .size(COL_NUM_W - 2, 9)
        .stretchXY()
        .centerAlign()
        .scale(0.85)
        .color(0xFFFFFF)
        .draw(ctx);
}

function drawDestination(ctx, pids, train, x, y) {
    let destText, destX, destW;
    if (isNonPassenger(train, pids)) {
        destText = "不載客列車|Not in Service";
        destX = COL_NUM_X;
        destW = COL_DEST_X + COL_DEST_W - COL_NUM_X;
    } else {
        destText = train.destination();
        destX = x;
        destW = COL_DEST_W;
    }
    Text.create()
        .text(TextUtil.cycleString(destText))
        .pos(destX, y)
        .size(destW, 9)
        .marquee()
        .scale(TEXT_SCALE)
        .color(0x000000)
        .draw(ctx);
}

function drawPlatformCircle(ctx, train, x, y) {
    let size = COL_PLAT_W;
    Texture.create()
        .texture(IMG_PLATFORM_CIRCLE)
        .color(train.routeColor())
        .pos(x, y - 1.5)
        .size(size, size)
        .draw(ctx);
    Text.create()
        .text(train.platformName())
        .pos(x + size / 2, y + 1.5)
        .centerAlign()
        .scale(0.7)
        .color(0xFFFFFF)
        .draw(ctx);
}

function drawRouteMapStations(ctx, pids, train) {
    let route = train.route();
    if (!route) return;

    let routePlatforms = route.getPlatforms();
    if (!routePlatforms || routePlatforms.size() < 2) return;

    let currentStation = pids.station();
    let currentIdx = 0;
    if (currentStation) {
        let curName = "" + currentStation.name;
        for (let i = 0; i < routePlatforms.size(); i++) {
            if ("" + routePlatforms.get(i).getStationName() === curName) {
                currentIdx = i;
                break;
            }
        }
    }

    let total = routePlatforms.size();
    let idx0 = currentIdx;
    let idx1 = Math.min(currentIdx + 1, total - 1);
    let onlyOneLeft = (idx1 >= total - 1);

    let lineColor = train.routeColor();
    let circleSize = 7;
    let lineThickness = 4;
    let circleY = pids.height - 16;
    let lineY = circleY + circleSize / 2;

    let name0 = TextUtil.cycleString("" + routePlatforms.get(idx0).getStationName());
    let name1 = TextUtil.cycleString("" + routePlatforms.get(idx1).getStationName());

    if (onlyOneLeft) {
        let x0 = 32;
        let x1 = pids.width - 32;
        let cx0 = x0 + circleSize / 2;
        let cx1 = x1 + circleSize / 2;

        Texture.create()
            .texture("mtr:textures/block/white.png")
            .color(lineColor)
            .pos(cx0, lineY - lineThickness / 2)
            .size(cx1 - cx0, lineThickness)
            .draw(ctx);

        drawArrowImage(ctx, (cx0 + cx1) / 2, lineY, lineColor);

        drawSmallCircle(ctx, x0, circleY, circleSize, lineColor);
        drawSmallCircle(ctx, x1, circleY, circleSize, lineColor);

        drawStationName(ctx, name0, cx0, circleY - 3, 0.55);
        drawStationName(ctx, name1, cx1, circleY - 3, 0.55);

    } else {
        let idx2 = Math.min(currentIdx + 2, total - 1);
        let name2 = TextUtil.cycleString("" + routePlatforms.get(idx2).getStationName());

        let x0 = 18;
        let x1 = pids.width / 2 - circleSize / 2;
        let x2 = pids.width - 18 - circleSize;
        let cx0 = x0 + circleSize / 2;
        let cx1 = x1 + circleSize / 2;
        let cx2 = x2 + circleSize / 2;

        Texture.create()
            .texture("mtr:textures/block/white.png")
            .color(lineColor)
            .pos(cx0, lineY - lineThickness / 2)
            .size(cx2 - cx0, lineThickness)
            .draw(ctx);

        drawArrowImage(ctx, (cx0 + cx1) / 2, lineY, lineColor);

        drawSmallCircle(ctx, x0, circleY, circleSize, lineColor);
        drawSmallCircle(ctx, x1, circleY, circleSize, lineColor);
        drawSmallCircle(ctx, x2, circleY, circleSize, lineColor);

        drawStationName(ctx, name0, cx0, circleY - 3, 0.55);
        drawStationName(ctx, name1, cx1, circleY - 3, 0.55);
        drawStationName(ctx, name2, cx2, circleY - 3, 0.55);
    }
}

function drawArrowImage(ctx, x, y, color) {
    let arrowW = 5;
    let arrowH = 4;
    Texture.create()
        .texture(IMG_ARROW)
        .pos(x - arrowW / 2, y - arrowH / 2)
        .size(arrowW, arrowH)
        .draw(ctx);
}

function drawSmallCircle(ctx, x, y, size, color) {
    Texture.create()
        .texture(IMG_PLATFORM_CIRCLE)
        .color(color)
        .pos(x, y)
        .size(size, size)
        .draw(ctx);
}

function drawStationName(ctx, name, centerX, yBottom, scale) {
    if (hasChinese(name)) {
        let str = name;
        for (let i = str.length - 1; i >= 0; i--) {
            let ch = str.charAt(i);
            let charY = yBottom - (str.length - 1 - i) * scale * 7;
            Text.create()
                .text(ch)
                .pos(centerX, charY)
                .scale(scale)
                .centerAlign()
                .color(0x000000)
                .draw(ctx);
        }
    } else {
        Text.create()
            .text(name)
            .pos(centerX, yBottom - 5)
            .scale(scale * 0.8)
            .centerAlign()
            .color(0x000000)
            .draw(ctx);
    }
}

function hasChinese(str) {
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code >= 0x4E00 && code <= 0x9FFF) return true;
    }
    return false;
}

function isNonPassenger(train, pids) {
    let route = train.route();
    if (!route) return true;
    let platforms = route.getPlatforms();
    if (!platforms || platforms.size() === 0) return true;
    let currentStation = pids.station();
    if (!currentStation) return false;
    let curName = "" + currentStation.name;
    for (let i = 0; i < platforms.size(); i++) {
        if ("" + platforms.get(i).getStationName() === curName) {
            return i >= platforms.size() - 1;
        }
    }
    return false;
}

function formatArrivalTime(arrivalTimestamp, now) {
    let eta = (arrivalTimestamp - now) / 1000;
    if (eta <= 0) return "";
    let minutes = Math.ceil(eta / 60);
    if (minutes <= 30) {
        return TextUtil.cycleString(minutes + "分|" + minutes + " min");
    }
    return formatTime(arrivalTimestamp);
}

function formatTime(timestamp) {
    let date = new Date(timestamp);
    let h = String(date.getHours()).padStart(2, "0");
    let m = String(date.getMinutes()).padStart(2, "0");
    return h + ":" + m;
}

function getColorByKeyword(text, defaultColor) {
    if (text.includes("区間快速") || text.includes("Semi-Rapid")) return 0x009944;
    if (text.includes("特急") || text.includes("Limited Express")) return 0xE60012;
    if (text.includes("急行") || text.includes("Express")) return 0xEE7800;
    if (text.includes("快速") || text.includes("Rapid")) return 0x0067C4;
    if (text.includes("各停") || text.includes("Local")) return 0x777777;
    if (text.includes("普通") || text.includes("Local")) return 0x777777;
    return defaultColor;
}
