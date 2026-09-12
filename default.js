include(Resources.id("jsblock:scripts/pids_util.js"));
const IMG_EMPTY       = "jsblock:textures/pids/1.png";
const IMG_4ARRIVALS   = "jsblock:textures/pids/2.png";
const IMG_ROUTEMAP    = "jsblock:textures/pids/3.png";
const IMG_ARRIVING    = "jsblock:textures/pids/4.png";
const IMG_DOORCLOSING = "jsblock:textures/pids/5.png";
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
    state.wasSpecial = false;
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
        let etaDepart = (firstTrain.departureTime() - now) / 1000;
        if (etaArrive > 5400) {
            mode = "empty";
        } else if (etaArrive > 0 && etaArrive <= 60) {
            mode = "arriving";
        } else if (etaDepart > 0 && etaDepart <= 10) {
            mode = "doorclosing";
        }
    }

    let currentView = 2;
    if (mode === "normal") {
        if (state.wasSpecial) {
            state.cycleTimer = 0;
            state.wasSpecial = false;
        }
        state.cycleTimer++;
        let totalPhase = Math.floor(state.cycleTimer / LANG_PHASE_FRAMES);
        currentView = (Math.floor(totalPhase / PHASES_PER_VIEW) % 2 === 0) ? 2 : 3;
    } else {
        state.wasSpecial = true;
        state.cycleTimer++;
    }

    if (mode === "empty") {
        drawImage(ctx, pids, IMG_EMPTY);
        drawWeatherAndClock(ctx, pids);
        drawEmptyNotice(ctx, pids);
        return;
    }
    if (mode === "arriving") {
        drawImage(ctx, pids, IMG_ARRIVING);
        drawWeatherAndClock(ctx, pids);
        drawArrivingView(ctx, pids, firstTrain, now);
        return;
    }
    if (mode === "doorclosing") {
        drawImage(ctx, pids, IMG_DOORCLOSING);
        drawWeatherAndClock(ctx, pids);
        drawDoorClosingView(ctx, pids, firstTrain, now);
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
    if (!isNonPassenger(train, pids)) {
        drawRouteMapStations(ctx, pids, train);
    }
}

function drawArrivingView(ctx, pids, train, now) {
    let y = HEADER_OFFSET + 3 * ROW_SPACING;
    drawTrainNumber(ctx, pids, train, COL_NUM_X, y);
    drawDestination(ctx, pids, train, COL_DEST_X, y);
    drawPlatformCircle(ctx, train, COL_PLAT_X, y);

    Text.create()
        .text(TextUtil.cycleString("即將到達|Arriving"))
        .pos(pids.width - 4, y)
        .size(TIME_MAX_W, 9)
        .stretchXY()
        .rightAlign()
        .scale(TEXT_SCALE)
 
