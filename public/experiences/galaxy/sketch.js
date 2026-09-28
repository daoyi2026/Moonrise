const MAIN_LOOP_TIME=72;
const INTRO_DURATION=18.9;
const INTRO_FISH_START=2.2;
const INTRO_FISH_END=18.35;
const INTRO_SETTLE_START=18.05;
const MAIN_START_OFFSET=3.35;
const LOOP_TIME=INTRO_DURATION+(MAIN_LOOP_TIME-MAIN_START_OFFSET);

const GUST_START=4.0;
const GUST_END=14.0;
const RISE_START=14.0;
const RISE_END=38.0;
const BREAK_START=14.8;

const RIDGE_RAIN_START=36.0;
const RIDGE_RAIN_END=68.0;

const LINE_FADE_START=RIDGE_RAIN_START;
const LINE_FADE_END=RIDGE_RAIN_START+8.0;

const SCALE_FADE_START=50.0;
const SCALE_FADE_END=66.0;

const MOON_GROW_START=12.5;
const MOON_GROW_END=47.5;

const TOP_COUNT=22;
const SIDE_COUNT=13;
const BOTTOM_COUNT=20;
const INTERIOR_ROWS=12;
const EXTRA_INTERIOR_COUNT=76;

const GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5));

let waterTop;
let netTop;
let fishSizePx;

let gatherCenter;
let moonStart;
let moonEnd;
let moonRadius;

let nodes=[];
let edges=[];
let ridgeEdges=[];

let topNodes=[];
let leftNodes=[];
let rightNodes=[];
let bottomNodes=[];
let interiorRowGroups=[];

let moonCore=[];
let ridgeNodes=[];

let fallingScales=[];
let fragments=[];
let ridgeDrops=[];
let ripples=[];

let stars=[];
let glints=[];
let brokenStrands=[];

let fishDropPath;

let seedValue=928137;
let startMs=0;
let ridgeDropAccumulator=0;

let introPathSamples=[];
let introFishFacingAngle=0;
let introFishFacingReady=false;

let mobileMode=false;

let stableViewportWidth=0;
let stableViewportHeight=0;
let stablePortrait=true;

let mainCanvas=null;


function configureMobilePage(){

  if(typeof document==="undefined"){
    return;
  }

  let viewportMeta=
    document.querySelector(
      'meta[name="viewport"]'
    );

  if(!viewportMeta){

    viewportMeta=
      document.createElement(
        "meta"
      );

    viewportMeta.name=
      "viewport";

    document.head.appendChild(
      viewportMeta
    );
  }

  viewportMeta.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
  );

  document.documentElement.style.margin="0";
  document.documentElement.style.padding="0";
  document.documentElement.style.background="rgb(2,10,27)";

  document.body.style.margin="0";
  document.body.style.padding="0";

  document.body.style.overflowX="hidden";
  document.body.style.overflowY="auto";

  document.body.style.touchAction="pan-y";
  document.body.style.background="rgb(2,10,27)";
}


function getViewportSize(){

  const viewportW=
    Math.max(
      1,
      Math.round(
        (
          typeof window!=="undefined" &&
          window.innerWidth
        ) ||
        390
      )
    );

  const viewportH=
    Math.max(
      1,
      Math.round(
        (
          typeof window!=="undefined" &&
          window.innerHeight
        ) ||
        844
      )
    );

  return{
    w:viewportW,
    h:viewportH
  };
}


function getCanvasSize(viewport){

  const portraitNow=
    viewport.h>=viewport.w;

  const phoneLike=
    portraitNow &&
    viewport.w<=900;

  if(phoneLike){

    return{
      w:viewport.w,

      // 手机竖屏固定 1 : 2
      h:Math.round(
        viewport.w*2
      )
    };
  }

  return{
    w:viewport.w,
    h:viewport.h
  };
}


function setup(){

  configureMobilePage();

  const viewport=
    getViewportSize();

  const canvasSize=
    getCanvasSize(
      viewport
    );

  stableViewportWidth=
    viewport.w;

  stableViewportHeight=
    viewport.h;

  stablePortrait=
    viewport.h>=viewport.w;

  mainCanvas=
    createCanvas(
      canvasSize.w,
      canvasSize.h
    );

  mainCanvas.elt.style.display=
    "block";

  mainCanvas.elt.style.width=
    canvasSize.w+"px";

  mainCanvas.elt.style.height=
    canvasSize.h+"px";

  mainCanvas.elt.style.maxWidth=
    "100vw";

  mainCanvas.elt.style.touchAction=
    "pan-y";

  pixelDensity(1);

  frameRate(60);

  resetScene();
}


function resetScene(){

  randomSeed(seedValue);
  noiseSeed(seedValue);

  startMs=millis();

  ridgeDropAccumulator=0;

  nodes=[];
  edges=[];
  ridgeEdges=[];

  topNodes=[];
  leftNodes=[];
  rightNodes=[];
  bottomNodes=[];

  interiorRowGroups=[];

  moonCore=[];
  ridgeNodes=[];

  fallingScales=[];
  fragments=[];
  ridgeDrops=[];
  ripples=[];

  stars=[];
  glints=[];
  brokenStrands=[];

  introFishFacingAngle=0;
  introFishFacingReady=false;

  mobileMode=
    height>width &&
    width/height<0.82;


  if(mobileMode){

    waterTop=
      height*0.485;

    netTop=
      height*0.50;

    fishSizePx=
      width*0.021;

    gatherCenter=
      createVector(
        width*0.72,
        height*0.67
      );

    moonStart=
      gatherCenter.copy();

    moonEnd=
      createVector(
        width*0.72,
        height*0.255
      );

    moonRadius=
      width*0.105;

  }else{

    waterTop=
      height*0.55;

    netTop=
      waterTop+
      height*0.012;

    fishSizePx=
      min(
        width,
        height
      )*
      0.021;

    gatherCenter=
      createVector(
        width*0.74,
        height*0.68
      );

    moonStart=
      gatherCenter.copy();

    moonEnd=
      createVector(
        width*0.735,
        height*0.27
      );

    moonRadius=
      min(
        width,
        height
      )*
      0.094875;
  }

  makeFishPath();
  makeStars();
  makeGlints();
  makeNet();

  chooseMoonCoreTwentyPercent();
  buildMountainRidge();
  addHorizontalReinforcementEdges();

  prepareIntroRevealSchedule();
}


function draw(){

  let sceneT=
    (millis()-startMs)/
    1000;

  if(sceneT>LOOP_TIME){

    resetScene();

    sceneT=0;
  }

  drawBackgroundGradient();

  drawStars(sceneT);
  drawGlints(sceneT);

  if(sceneT<INTRO_DURATION){

    drawIntroSequence(
      sceneT
    );

    return;
  }

  const t=
    sceneT-
    INTRO_DURATION+
    MAIN_START_OFFSET;

  const moon=
    getMoonState(t);

  stepNetwork(
    t,
    moon
  );

  updateEdges(t);
  updateBrokenStrands(t);
  updateScaleDrops(t);

  drawNet(
    t,
    moon
  );

  drawBrokenStrands(t);

  drawAttachedScales(
    t,
    moon
  );

  drawMoonFusion(
    t,
    moon
  );

  updateFallingScales();
  drawFallingScales();

  updateFragments();
  drawFragments();

  updateRidgeDrops(t);
  drawRidgeDrops();

  updateRipples();
  drawRipples();
}


function drawIntroSequence(t){

  const fishState=
    getIntroFishState(t);

  stepIntroNetwork(
    t,
    fishState
  );

  drawNet(
    0,
    {
      formation:0
    }
  );

  drawIntroScaleLights(t);
  drawIntroRevealedScales(t);

  if(fishState.active){

    drawIntroFish(
      fishState,
      t
    );
  }
}


function prepareIntroRevealSchedule(){

  introPathSamples=[];

  const sampleCount=360;

  for(
    let i=0;
    i<=sampleCount;
    i++
  ){

    const rawProgress=
      i/sampleCount;

    const travelProgress=
      getIntroTravelProgress(
        rawProgress
      );

    const pointValue=
      getIntroFishPathPoint(
        travelProgress
      );

    introPathSamples.push({

      timeValue:
        lerp(
          INTRO_FISH_START,
          INTRO_FISH_END,
          rawProgress
        ),

      progressValue:
        travelProgress,

      x:
        pointValue.x,

      y:
        pointValue.y
    });
  }

  const revealRadius=
    min(
      width,
      height
    )*
    0.24;

  for(const node of nodes){

    if(
      node.fixed ||
      !node.hasScale
    ){
      continue;
    }

    let nearestDistance=
      Infinity;

    let passTime=
      INTRO_FISH_END;

    for(const sample of introPathSamples){

      const distanceValue=
        dist(
          node.original.x,
          node.original.y,
          sample.x,
          sample.y
        );

      if(
        distanceValue<
        nearestDistance
      ){

        nearestDistance=
          distanceValue;

        passTime=
          sample.timeValue;
      }
    }

    const distanceRatio=
      constrain(
        nearestDistance/
        revealRadius,
        0,
        1
      );

    const revealDelay=
      lerp(
        0.12,
        0.52,
        distanceRatio
      )+
      random(
        0.03,
        0.18
      );

    node.introRevealAt=
      passTime+
      revealDelay;
  }
}


function getIntroTravelProgress(rawProgress){

  const u=
    constrain(
      rawProgress,
      0,
      1
    );

  const variedProgress=
    u-
    0.040*
    sin(
      TWO_PI*u
    )+
    0.012*
    sin(
      TWO_PI*
      3*
      u
    );

  return constrain(
    variedProgress,
    0,
    1
  );
}


function getIntroFishState(t){

  if(
    t<INTRO_FISH_START ||
    t>INTRO_FISH_END
  ){

    introFishFacingReady=false;

    return{
      active:false,
      x:-1000,
      y:-1000,
      angleValue:0,
      turnAmount:0,
      speedFactor:1,
      progressValue:0,
      opacityValue:0
    };
  }

  const rawProgress=
    constrain(
      (
        t-
        INTRO_FISH_START
      )/
      (
        INTRO_FISH_END-
        INTRO_FISH_START
      ),
      0,
      1
    );

  const progressValue=
    getIntroTravelProgress(
      rawProgress
    );

  const pointValue=
    getIntroFishPathPoint(
      progressValue
    );

  const headingLook=
    0.015;

  const beforeValue=
    getIntroFishPathPoint(
      max(
        0,
        progressValue-
        headingLook
      )
    );

  const afterValue=
    getIntroFishPathPoint(
      min(
        1,
        progressValue+
        headingLook
      )
    );

  const targetAngle=
    atan2(
      afterValue.y-
      beforeValue.y,

      afterValue.x-
      beforeValue.x
    );

  if(!introFishFacingReady){

    introFishFacingAngle=
      targetAngle;

    introFishFacingReady=
      true;

  }else{

    const angleDifference=
      atan2(
        sin(
          targetAngle-
          introFishFacingAngle
        ),

        cos(
          targetAngle-
          introFishFacingAngle
        )
      );

    const angleFollow=
      1-
      Math.exp(
        -min(
          deltaTime,
          40
        )/
        145
      );

    introFishFacingAngle+=
      angleDifference*
      angleFollow;
  }

  const curvatureLook=
    0.032;

  const curveBefore=
    getIntroFishPathPoint(
      max(
        0,
        progressValue-
        curvatureLook
      )
    );

  const curveAfter=
    getIntroFishPathPoint(
      min(
        1,
        progressValue+
        curvatureLook
      )
    );

  const angleBefore=
    atan2(
      pointValue.y-
      curveBefore.y,

      pointValue.x-
      curveBefore.x
    );

  const angleAfter=
    atan2(
      curveAfter.y-
      pointValue.y,

      curveAfter.x-
      pointValue.x
    );

  const turnAmount=
    constrain(
      atan2(
        sin(
          angleAfter-
          angleBefore
        ),

        cos(
          angleAfter-
          angleBefore
        )
      ),

      -0.78,
      0.78
    );

  const speedProbe=
    0.004;

  const progressBefore=
    getIntroTravelProgress(
      max(
        0,
        rawProgress-
        speedProbe
      )
    );

  const progressAfter=
    getIntroTravelProgress(
      min(
        1,
        rawProgress+
        speedProbe
      )
    );

  const speedFactor=
    constrain(
      (
        progressAfter-
        progressBefore
      )/
      (
        speedProbe*
        2
      ),

      0.58,
      1.42
    );

  const fadeIn=
    smoothStep01(
      progress01(
        t,
        INTRO_FISH_START,
        INTRO_FISH_START+
        0.78
      )
    );

  const fadeOut=
    1-
    smoothStep01(
      progress01(
        t,
        INTRO_FISH_END-
        0.92,
        INTRO_FISH_END
      )
    );

  return{

    active:true,

    x:
      pointValue.x,

    y:
      pointValue.y,

    angleValue:
      introFishFacingAngle,

    turnAmount,

    speedFactor,

    progressValue,

    opacityValue:
      min(
        fadeIn,
        fadeOut
      )
  };
}


function getIntroFishPathPoint(progressValue){

  const pathPoints=[
    {x:-0.12,y:0.89},
    {x:0.03,y:0.84},
    {x:0.17,y:0.75},
    {x:0.34,y:0.63},
    {x:0.53,y:0.57},
    {x:0.70,y:0.63},
    {x:0.82,y:0.75},
    {x:0.79,y:0.84},
    {x:0.68,y:0.90},
    {x:0.52,y:0.91},
    {x:0.36,y:0.86},
    {x:0.24,y:0.76},
    {x:0.22,y:0.66},
    {x:0.30,y:0.58},
    {x:0.46,y:0.53},
    {x:0.64,y:0.55},
    {x:0.80,y:0.63},
    {x:0.91,y:0.73},
    {x:0.93,y:0.82},
    {x:0.88,y:0.88},
    {x:0.78,y:0.86},
    {x:0.72,y:0.78},
    {x:0.74,y:0.69},
    {x:0.84,y:0.62},
    {x:0.98,y:0.60},
    {x:1.12,y:0.64}
  ];

  const count=
    pathPoints.length;

  const scaledValue=
    constrain(
      progressValue,
      0,
      0.999999
    )*
    (
      count-
      1
    );

  const indexValue=
    floor(
      scaledValue
    );

  const localValue=
    scaledValue-
    indexValue;

  const p0=
    pathPoints[
      max(
        0,
        indexValue-
        1
      )
    ];

  const p1=
    pathPoints[
      indexValue
    ];

  const p2=
    pathPoints[
      min(
        count-
        1,
        indexValue+
        1
      )
    ];

  const p3=
    pathPoints[
      min(
        count-
        1,
        indexValue+
        2
      )
    ];

  return{

    x:
      catmullRomValue(
        p0.x,
        p1.x,
        p2.x,
        p3.x,
        localValue
      )*
      width,

    y:
      catmullRomValue(
        p0.y,
        p1.y,
        p2.y,
        p3.y,
        localValue
      )*
      height
  };
}


function catmullRomValue(
  p0,
  p1,
  p2,
  p3,
  parameterValue
){

  const t2=
    parameterValue*
    parameterValue;

  const t3=
    t2*
    parameterValue;

  return 0.5*(
    2*p1+

    (
      -p0+
      p2
    )*
    parameterValue+

    (
      2*p0-
      5*p1+
      4*p2-
      p3
    )*
    t2+

    (
      -p0+
      3*p1-
      3*p2+
      p3
    )*
    t3
  );
}


function stepIntroNetwork(
  t,
  fishState
){

  const settleAmount=
    1-
    smoothStep01(
      progress01(
        t,
        INTRO_SETTLE_START,
        INTRO_DURATION
      )
    );

  const fishRadius=
    min(
      width,
      height
    )*
    0.22;

  for(const node of nodes){

    if(node.fixed){

      node.pos.set(
        node.original
      );

      node.vel.set(
        0,
        0
      );

      continue;
    }

    const gentleX=
      (
        sin(
          t*
          1.14+
          node.original.y*
          0.014+
          node.windPhase
        )*
        2.2+

        cos(
          t*
          0.72+
          node.original.x*
          0.008
        )*
        1.1
      )*
      settleAmount;

    const gentleY=
      (
        sin(
          t*
          1.02+
          node.original.x*
          0.012+
          node.windPhase
        )*
        3.0+

        cos(
          t*
          0.66+
          node.original.y*
          0.010
        )*
        1.25
      )*
      settleAmount;

    let targetX=
      node.original.x+
      gentleX;

    let targetY=
      node.original.y+
      gentleY;

    if(fishState.active){

      const dx=
        node.original.x-
        fishState.x;

      const dy=
        node.original.y-
        fishState.y;

      const distanceValue=
        max(
          1,
          sqrt(
            dx*dx+
            dy*dy
          )
        );

      const influence=
        pow(
          constrain(
            1-
            distanceValue/
            fishRadius,
            0,
            1
          ),
          1.65
        )*
        fishState.opacityValue;

      if(influence>0.001){

        const radialX=
          dx/
          distanceValue;

        const radialY=
          dy/
          distanceValue;

        const tangentX=
          -radialY;

        const tangentY=
          radialX;

        const churn=
          sin(
            t*
            8.7+
            node.windPhase*
            1.7+
            distanceValue*
            0.035
          );

        const pulse=
          0.62+
          0.38*
          sin(
            t*
            5.4+
            node.original.x*
            0.017
          );

        targetX+=
          (
            radialX*
            28*
            pulse+

            tangentX*
            46*
            churn
          )*
          influence;

        targetY+=
          (
            radialY*
            22*
            pulse+

            tangentY*
            40*
            churn
          )*
          influence;
      }
    }

    const previousX=
      node.pos.x;

    const previousY=
      node.pos.y;

    node.pos.x=
      lerp(
        node.pos.x,
        targetX,
        0.24
      );

    node.pos.y=
      lerp(
        node.pos.y,
        targetY,
        0.24
      );

    node.vel.x=
      node.pos.x-
      previousX;

    node.vel.y=
      node.pos.y-
      previousY;
  }
}


function drawIntroScaleLights(t){

  noStroke();

  for(const node of nodes){

    if(
      node.fixed ||
      !node.hasScale
    ){
      continue;
    }

    const revealAmount=
      smoothStep01(
        progress01(
          t,
          node.introRevealAt,
          node.introRevealAt+
          0.55
        )
      );

    const blinkValue=
      pow(
        max(
          0,
          sin(
            t*
            node.introTwinkleSpeed+
            node.introTwinklePhase
          )
        ),
        5
      );

    const pointOpacity=
      (
        18+
        blinkValue*
        150
      )*
      (
        1-
        revealAmount
      );

    if(pointOpacity<=0.8){
      continue;
    }

    fill(
      245,
      250,
      255,
      pointOpacity*
      0.16
    );

    circle(
      node.pos.x,
      node.pos.y,
      5.2+
      blinkValue*
      2.4
    );

    fill(
      250,
      253,
      255,
      pointOpacity
    );

    circle(
      node.pos.x,
      node.pos.y,
      0.8+
      blinkValue*
      1.45
    );
  }
}


function drawIntroRevealedScales(t){

  for(const node of nodes){

    if(
      node.fixed ||
      !node.hasScale
    ){
      continue;
    }

    const revealAmount=
      smoothStep01(
        progress01(
          t,
          node.introRevealAt,
          node.introRevealAt+
          0.72
        )
      );

    if(revealAmount<=0.001){
      continue;
    }

    const blinkBase=
      (
        sin(
          frameCount*
          node.scaleSpeed+
          node.scalePhase
        )+
        1
      )*
      0.5;

    const sparkle=
      pow(
        blinkBase,
        4
      );

    const opacityValue=
      lerp(
        45,
        node.scaleOpacity,
        sparkle
      )*
      revealAmount;

    const swing=
      sin(
        frameCount*
        node.swingSpeed+
        node.swingPhase
      )*
      node.swingAngle*
      0.72;

    drawFishLamp(
      node.pos.x,
      node.pos.y,
      swing,
      opacityValue,
      0.18+
      sparkle*
      0.52,
      1.0
    );
  }
}


function drawIntroFish(
  fishState,
  t
){

  const ctx=
    drawingContext;

  const fishLength=
    mobileMode
      ?
      width*
      0.115
      :
      min(
        width,
        height
      )*
      0.10875;

  const fishHeight=
    fishLength*
    0.23;

  const opacityValue=
    fishState.opacityValue;

  const swimPhase=
    t*
    2.75+
    sin(
      t*
      0.53
    )*
    0.34;

  const swimEnergy=
    lerp(
      0.80,
      1.08,

      constrain(
        (
          fishState.speedFactor-
          0.58
        )/
        0.84,

        0,
        1
      )
    );

  const turnStrength=
    fishState.turnAmount;

  const bodyCount=
    42;

  const segmentLength=
    fishLength*
    0.985/
    bodyCount;

  const centers=[];
  const halfWidths=[];
  const tangents=[];
  const normals=[];
  const upperPoints=[];
  const lowerPoints=[];

  centers.push({
    x:
      fishLength*
      0.50,
    y:0
  });

  for(
    let i=1;
    i<=bodyCount;
    i++
  ){

    const s=
      i/bodyCount;

    const tailWeight=
      pow(
        s,
        1.55
      );

    const swimAngle=
      sin(
        swimPhase-
        s*
        6.15
      )*
      (
        0.025+
        0.255*
        tailWeight
      )*
      swimEnergy;

    const fineRipple=
      sin(
        swimPhase*
        1.47-
        s*
        10.2
      )*
      0.028*
      s;

    const turnAngle=
      -turnStrength*
      0.82*
      pow(
        s,
        1.20
      )*
      smoothStep01(
        constrain(
          (
            s-
            0.06
          )/
          0.94,

          0,
          1
        )
      );

    const localAngle=
      PI+
      swimAngle+
      fineRipple+
      turnAngle;

    const previous=
      centers[
        i-1
      ];

    centers.push({

      x:
        previous.x+
        cos(
          localAngle
        )*
        segmentLength,

      y:
        previous.y+
        sin(
          localAngle
        )*
        segmentLength
    });
  }

  for(
    let i=0;
    i<=bodyCount;
    i++
  ){

    const s=
      i/bodyCount;

    const headRound=
      lerp(
        0.52,
        1.0,

        smoothStep01(
          constrain(
            s/0.20,
            0,
            1
          )
        )
      );

    const tailTaper=
      lerp(
        1.0,
        0.14,
        pow(
          s,
          2.70
        )
      );

    const bellyShape=
      0.78+
      0.22*
      sin(
        PI*
        constrain(
          s,
          0,
          1
        )
      );

    const halfBody=
      fishHeight*
      0.50*
      headRound*
      tailTaper*
      bellyShape;

    halfWidths.push(
      max(
        fishHeight*
        0.040,
        halfBody
      )
    );
  }

  for(
    let i=0;
    i<=bodyCount;
    i++
  ){

    const previousPoint=
      centers[
        max(
          0,
          i-1
        )
      ];

    const nextPoint=
      centers[
        min(
          bodyCount,
          i+1
        )
      ];

    let tangentX=
      nextPoint.x-
      previousPoint.x;

    let tangentY=
      nextPoint.y-
      previousPoint.y;

    const tangentLength=
      max(
        0.0001,

        sqrt(
          tangentX*
          tangentX+
          tangentY*
          tangentY
        )
      );

    tangentX/=
      tangentLength;

    tangentY/=
      tangentLength;

    const normalX=
      -tangentY;

    const normalY=
      tangentX;

    tangents.push({
      x:tangentX,
      y:tangentY
    });

    normals.push({
      x:normalX,
      y:normalY
    });

    const s=
      i/bodyCount;

    const skinRipple=
      sin(
        swimPhase*
        1.28-
        s*
        8.7
      )*
      fishHeight*
      0.008*
      pow(
        s,
        1.1
      );

    const widthValue=
      halfWidths[i]+
      skinRipple;

    upperPoints.push({

      x:
        centers[i].x+
        normalX*
        widthValue,

      y:
        centers[i].y+
        normalY*
        widthValue
    });

    lowerPoints.push({

      x:
        centers[i].x-
        normalX*
        widthValue,

      y:
        centers[i].y-
        normalY*
        widthValue
    });
  }

  const lastIndex=
    centers.length-
    1;

  const rootCenter=
    centers[
      lastIndex
    ];

  const tailTangent=
    tangents[
      lastIndex
    ];

  const tailNormal=
    normals[
      lastIndex
    ];

  const tailFlutter=
    sin(
      swimPhase-
      6.45
    )*
    fishHeight*
    0.52*
    swimEnergy;

  const tailUpperRoot=
    upperPoints[
      lastIndex
    ];

  const tailLowerRoot=
    lowerPoints[
      lastIndex
    ];

  const tailCenter={

    x:
      rootCenter.x+
      tailTangent.x*
      fishLength*
      0.30+
      tailNormal.x*
      tailFlutter*
      0.34,

    y:
      rootCenter.y+
      tailTangent.y*
      fishLength*
      0.30+
      tailNormal.y*
      tailFlutter*
      0.34
  };

  const upperLobeTip={

    x:
      tailCenter.x+
      tailNormal.x*
      fishHeight*
      0.54,

    y:
      tailCenter.y+
      tailNormal.y*
      fishHeight*
      0.54
  };

  const lowerLobeTip={

    x:
      tailCenter.x-
      tailNormal.x*
      fishHeight*
      0.54,

    y:
      tailCenter.y-
      tailNormal.y*
      fishHeight*
      0.54
  };

  const tailNotch={

    x:
      rootCenter.x+
      tailTangent.x*
      fishLength*
      0.39+
      tailNormal.x*
      tailFlutter*
      0.48,

    y:
      rootCenter.y+
      tailTangent.y*
      fishLength*
      0.39+
      tailNormal.y*
      tailFlutter*
      0.48
  };

  ctx.save();

  ctx.translate(
    fishState.x,
    fishState.y
  );

  ctx.rotate(
    fishState.angleValue+
    sin(
      t*
      1.2
    )*
    0.008
  );

  const glow=
    ctx.createRadialGradient(
      fishLength*
      0.05,
      0,
      0,

      fishLength*
      0.05,
      0,

      fishLength*
      0.92
    );

  glow.addColorStop(
    0,
    "rgba(230,246,255,"+
    (
      0.085*
      opacityValue
    )+
    ")"
  );

  glow.addColorStop(
    1,
    "rgba(220,240,255,0)"
  );

  ctx.fillStyle=
    glow;

  ctx.beginPath();

  ctx.ellipse(
    0,
    0,
    fishLength*
    0.90,
    fishHeight*
    1.22,
    0,
    0,
    TWO_PI
  );

  ctx.fill();


  ctx.beginPath();

  ctx.moveTo(
    upperPoints[0].x,
    upperPoints[0].y
  );

  for(
    let i=1;
    i<upperPoints.length;
    i++
  ){

    ctx.lineTo(
      upperPoints[i].x,
      upperPoints[i].y
    );
  }

  ctx.bezierCurveTo(

    tailUpperRoot.x+
    tailTangent.x*
    fishLength*
    0.07,

    tailUpperRoot.y+
    tailTangent.y*
    fishLength*
    0.07,

    upperLobeTip.x-
    tailTangent.x*
    fishLength*
    0.06,

    upperLobeTip.y-
    tailTangent.y*
    fishLength*
    0.06,

    upperLobeTip.x,
    upperLobeTip.y
  );

  ctx.bezierCurveTo(

    upperLobeTip.x+
    tailTangent.x*
    fishLength*
    0.035,

    upperLobeTip.y+
    tailTangent.y*
    fishLength*
    0.035,

    tailNotch.x+
    tailNormal.x*
    fishHeight*
    0.08,

    tailNotch.y+
    tailNormal.y*
    fishHeight*
    0.08,

    tailNotch.x,
    tailNotch.y
  );

  ctx.bezierCurveTo(

    tailNotch.x-
    tailNormal.x*
    fishHeight*
    0.08,

    tailNotch.y-
    tailNormal.y*
    fishHeight*
    0.08,

    lowerLobeTip.x+
    tailTangent.x*
    fishLength*
    0.035,

    lowerLobeTip.y+
    tailTangent.y*
    fishLength*
    0.035,

    lowerLobeTip.x,
    lowerLobeTip.y
  );

  ctx.bezierCurveTo(

    lowerLobeTip.x-
    tailTangent.x*
    fishLength*
    0.06,

    lowerLobeTip.y-
    tailTangent.y*
    fishLength*
    0.06,

    tailLowerRoot.x+
    tailTangent.x*
    fishLength*
    0.07,

    tailLowerRoot.y+
    tailTangent.y*
    fishLength*
    0.07,

    tailLowerRoot.x,
    tailLowerRoot.y
  );

  for(
    let i=
      lowerPoints.length-
      2;

    i>=0;
    i--
  ){

    ctx.lineTo(
      lowerPoints[i].x,
      lowerPoints[i].y
    );
  }

  ctx.closePath();

  ctx.fillStyle=
    "rgba(232,247,255,"+
    (
      0.16*
      opacityValue
    )+
    ")";

  ctx.fill();

  ctx.strokeStyle=
    "rgba(245,252,255,"+
    (
      0.46*
      opacityValue
    )+
    ")";

  ctx.lineWidth=
    0.86;

  ctx.lineJoin=
    "round";

  ctx.lineCap=
    "round";

  ctx.stroke();


  const dorsalAIndex=
    floor(
      bodyCount*
      0.24
    );

  const dorsalMIndex=
    floor(
      bodyCount*
      0.39
    );

  const dorsalBIndex=
    floor(
      bodyCount*
      0.55
    );

  const dorsalA=
    upperPoints[
      dorsalAIndex
    ];

  const dorsalM=
    upperPoints[
      dorsalMIndex
    ];

  const dorsalB=
    upperPoints[
      dorsalBIndex
    ];

  const dorsalNormal=
    normals[
      dorsalMIndex
    ];

  const dorsalTangent=
    tangents[
      dorsalMIndex
    ];

  const dorsalTip={

    x:
      dorsalM.x+
      dorsalNormal.x*
      fishHeight*
      0.48-
      dorsalTangent.x*
      fishLength*
      0.025,

    y:
      dorsalM.y+
      dorsalNormal.y*
      fishHeight*
      0.48-
      dorsalTangent.y*
      fishLength*
      0.025
  };

  ctx.beginPath();

  ctx.moveTo(
    dorsalA.x,
    dorsalA.y
  );

  ctx.quadraticCurveTo(
    dorsalTip.x,
    dorsalTip.y,
    dorsalB.x,
    dorsalB.y
  );

  ctx.quadraticCurveTo(

    dorsalM.x+
    dorsalNormal.x*
    fishHeight*
    0.08,

    dorsalM.y+
    dorsalNormal.y*
    fishHeight*
    0.08,

    dorsalA.x,
    dorsalA.y
  );

  ctx.closePath();

  ctx.fillStyle=
    "rgba(230,246,255,"+
    (
      0.105*
      opacityValue
    )+
    ")";

  ctx.fill();

  ctx.strokeStyle=
    "rgba(246,252,255,"+
    (
      0.30*
      opacityValue
    )+
    ")";

  ctx.lineWidth=
    0.62;

  ctx.stroke();


  const pectoralIndex=
    floor(
      bodyCount*
      0.25
    );

  const pectoralCenter=
    centers[
      pectoralIndex
    ];

  const pectoralNormal=
    normals[
      pectoralIndex
    ];

  const pectoralTangent=
    tangents[
      pectoralIndex
    ];

  const pectoralWidth=
    halfWidths[
      pectoralIndex
    ];

  const pectoralBase={

    x:
      pectoralCenter.x-
      pectoralNormal.x*
      pectoralWidth*
      0.50,

    y:
      pectoralCenter.y-
      pectoralNormal.y*
      pectoralWidth*
      0.50
  };

  const pectoralSway=
    sin(
      swimPhase-
      0.9
    )*
    fishHeight*
    0.10;

  const pectoralTip={

    x:
      pectoralBase.x-
      pectoralNormal.x*
      fishHeight*
      0.46+
      pectoralTangent.x*
      fishLength*
      0.10+
      pectoralNormal.x*
      pectoralSway,

    y:
      pectoralBase.y-
      pectoralNormal.y*
      fishHeight*
      0.46+
      pectoralTangent.y*
      fishLength*
      0.10+
      pectoralNormal.y*
      pectoralSway
  };

  const pectoralEnd={

    x:
      pectoralCenter.x-
      pectoralNormal.x*
      pectoralWidth*
      0.34-
      pectoralTangent.x*
      fishLength*
      0.10,

    y:
      pectoralCenter.y-
      pectoralNormal.y*
      pectoralWidth*
      0.34-
      pectoralTangent.y*
      fishLength*
      0.10
  };

  ctx.beginPath();

  ctx.moveTo(
    pectoralBase.x,
    pectoralBase.y
  );

  ctx.quadraticCurveTo(
    pectoralTip.x,
    pectoralTip.y,
    pectoralEnd.x,
    pectoralEnd.y
  );

  ctx.quadraticCurveTo(

    pectoralCenter.x-
    pectoralNormal.x*
    pectoralWidth*
    0.12,

    pectoralCenter.y-
    pectoralNormal.y*
    pectoralWidth*
    0.12,

    pectoralBase.x,
    pectoralBase.y
  );

  ctx.closePath();

  ctx.fillStyle=
    "rgba(232,247,255,"+
    (
      0.115*
      opacityValue
    )+
    ")";

  ctx.fill();

  ctx.strokeStyle=
    "rgba(247,252,255,"+
    (
      0.32*
      opacityValue
    )+
    ")";

  ctx.lineWidth=
    0.60;

  ctx.stroke();


  const pelvicIndex=
    floor(
      bodyCount*
      0.50
    );

  const pelvicCenter=
    centers[
      pelvicIndex
    ];

  const pelvicNormal=
    normals[
      pelvicIndex
    ];

  const pelvicTangent=
    tangents[
      pelvicIndex
    ];

  const pelvicWidth=
    halfWidths[
      pelvicIndex
    ];

  const pelvicBase={

    x:
      pelvicCenter.x-
      pelvicNormal.x*
      pelvicWidth*
      0.72,

    y:
      pelvicCenter.y-
      pelvicNormal.y*
      pelvicWidth*
      0.72
  };

  const pelvicTip={

    x:
      pelvicBase.x-
      pelvicNormal.x*
      fishHeight*
      0.25+
      pelvicTangent.x*
      fishLength*
      0.035,

    y:
      pelvicBase.y-
      pelvicNormal.y*
      fishHeight*
      0.25+
      pelvicTangent.y*
      fishLength*
      0.035
  };

  const pelvicEnd={

    x:
      pelvicBase.x-
      pelvicTangent.x*
      fishLength*
      0.065,

    y:
      pelvicBase.y-
      pelvicTangent.y*
      fishLength*
      0.065
  };

  ctx.beginPath();

  ctx.moveTo(
    pelvicBase.x,
    pelvicBase.y
  );

  ctx.quadraticCurveTo(
    pelvicTip.x,
    pelvicTip.y,
    pelvicEnd.x,
    pelvicEnd.y
  );

  ctx.strokeStyle=
    "rgba(245,251,255,"+
    (
      0.24*
      opacityValue
    )+
    ")";

  ctx.lineWidth=
    0.58;

  ctx.stroke();


  ctx.beginPath();

  ctx.moveTo(
    centers[2].x,
    centers[2].y
  );

  for(
    let i=3;
    i<centers.length;
    i++
  ){

    ctx.lineTo(
      centers[i].x,
      centers[i].y
    );
  }

  ctx.quadraticCurveTo(

    rootCenter.x+
    tailTangent.x*
    fishLength*
    0.15+
    tailNormal.x*
    tailFlutter*
    0.18,

    rootCenter.y+
    tailTangent.y*
    fishLength*
    0.15+
    tailNormal.y*
    tailFlutter*
    0.18,

    tailNotch.x,
    tailNotch.y
  );

  ctx.strokeStyle=
    "rgba(250,253,255,"+
    (
      0.13*
      opacityValue
    )+
    ")";

  ctx.lineWidth=
    0.52;

  ctx.stroke();


  const eyeIndex=3;

  const eyeCenter=
    centers[
      eyeIndex
    ];

  const eyeNormal=
    normals[
      eyeIndex
    ];

  ctx.fillStyle=
    "rgba(255,255,255,"+
    (
      0.70*
      opacityValue
    )+
    ")";

  ctx.beginPath();

  ctx.arc(

    eyeCenter.x+
    eyeNormal.x*
    fishHeight*
    0.13,

    eyeCenter.y+
    eyeNormal.y*
    fishHeight*
    0.13,

    max(
      0.62,
      fishHeight*
      0.030
    ),

    0,
    TWO_PI
  );

  ctx.fill();

  ctx.restore();
}


function getMoonState(t){

  const gust=
    smoothStep01(
      progress01(
        t,
        GUST_START,
        GUST_END
      )
    );

  const rise=
    smoothStep01(
      progress01(
        t,
        RISE_START,
        RISE_END
      )
    );

  const riseEase=
    easeInOutCubic(
      rise
    );

  const formation=
    smoothStep01(
      progress01(
        t,
        7.0,
        20.0
      )
    );

  return{
    gust,
    rise,
    formation,

    x:
      lerp(
        moonStart.x,
        moonEnd.x,
        riseEase
      ),

    y:
      lerp(
        moonStart.y,
        moonEnd.y,
        riseEase
      )
  };
}


function getMoonGrowthProgress(t){

  return easeInOutCubic(
    smoothStep01(
      progress01(
        t,
        MOON_GROW_START,
        MOON_GROW_END
      )
    )
  );
}


function getMeshFade(t){

  const rawFade=
    1-
    smoothStep01(
      progress01(
        t,
        LINE_FADE_START,
        LINE_FADE_END
      )
    );

  return pow(
    max(
      0,
      rawFade
    ),
    1.6
  );
}


function drawBackgroundGradient(){

  const ctx=
    drawingContext;

  const base=
    ctx.createLinearGradient(
      0,
      0,
      0,
      height
    );

  base.addColorStop(
    0.00,
    "rgb(224,234,244)"
  );

  base.addColorStop(
    0.10,
    "rgb(216,228,241)"
  );

  base.addColorStop(
    0.21,
    "rgb(199,216,237)"
  );

  base.addColorStop(
    0.33,
    "rgb(166,194,228)"
  );

  base.addColorStop(
    0.45,
    "rgb(123,161,211)"
  );

  base.addColorStop(
    0.56,
    "rgb(78,126,188)"
  );

  base.addColorStop(
    0.66,
    "rgb(46,91,154)"
  );

  base.addColorStop(
    0.75,
    "rgb(27,62,115)"
  );

  base.addColorStop(
    0.83,
    "rgb(15,40,82)"
  );

  base.addColorStop(
    0.90,
    "rgb(8,25,55)"
  );

  base.addColorStop(
    0.96,
    "rgb(4,15,36)"
  );

  base.addColorStop(
    1.00,
    "rgb(2,10,27)"
  );

  ctx.fillStyle=
    base;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  const topVeil=
    ctx.createLinearGradient(
      0,
      0,
      0,
      height*
      0.55
    );

  topVeil.addColorStop(
    0.00,
    "rgba(255,255,255,0.105)"
  );

  topVeil.addColorStop(
    0.20,
    "rgba(255,255,255,0.072)"
  );

  topVeil.addColorStop(
    0.45,
    "rgba(255,255,255,0.036)"
  );

  topVeil.addColorStop(
    0.72,
    "rgba(255,255,255,0.012)"
  );

  topVeil.addColorStop(
    1.00,
    "rgba(255,255,255,0.000)"
  );

  ctx.fillStyle=
    topVeil;

  ctx.fillRect(
    0,
    0,
    width,
    height*
    0.55
  );


  const midVeil=
    ctx.createLinearGradient(
      0,
      height*
      0.24,
      0,
      height*
      0.82
    );

  midVeil.addColorStop(
    0.00,
    "rgba(116,157,214,0.000)"
  );

  midVeil.addColorStop(
    0.28,
    "rgba(73,120,192,0.026)"
  );

  midVeil.addColorStop(
    0.55,
    "rgba(38,86,161,0.042)"
  );

  midVeil.addColorStop(
    0.78,
    "rgba(20,58,122,0.030)"
  );

  midVeil.addColorStop(
    1.00,
    "rgba(10,34,78,0.000)"
  );

  ctx.fillStyle=
    midVeil;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  const bottomVeil=
    ctx.createLinearGradient(
      0,
      height*
      0.62,
      0,
      height
    );

  bottomVeil.addColorStop(
    0.00,
    "rgba(0,4,18,0.000)"
  );

  bottomVeil.addColorStop(
    0.22,
    "rgba(0,4,18,0.035)"
  );

  bottomVeil.addColorStop(
    0.44,
    "rgba(0,4,18,0.090)"
  );

  bottomVeil.addColorStop(
    0.64,
    "rgba(0,4,18,0.165)"
  );

  bottomVeil.addColorStop(
    0.82,
    "rgba(0,4,18,0.245)"
  );

  bottomVeil.addColorStop(
    1.00,
    "rgba(0,4,18,0.330)"
  );

  ctx.fillStyle=
    bottomVeil;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  const deepBottom=
    ctx.createLinearGradient(
      0,
      height*
      0.78,
      0,
      height
    );

  deepBottom.addColorStop(
    0.00,
    "rgba(0,2,12,0.000)"
  );

  deepBottom.addColorStop(
    0.38,
    "rgba(0,2,12,0.055)"
  );

  deepBottom.addColorStop(
    0.72,
    "rgba(0,2,12,0.135)"
  );

  deepBottom.addColorStop(
    1.00,
    "rgba(0,2,12,0.220)"
  );

  ctx.fillStyle=
    deepBottom;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );
}


function makeStars(){

  const count=
    floor(
      constrain(
        width/90,
        10,
        24
      )
    );

  for(
    let i=0;
    i<count;
    i++
  ){

    stars.push({

      x:
        random(
          width*0.04,
          width*0.96
        ),

      y:
        random(
          height*0.03,
          height*0.48
        ),

      d:
        random(
          0.4,
          1.1
        ),

      opacityValue:
        random(
          6,
          20
        ),

      phase:
        random(
          TWO_PI
        ),

      speed:
        random(
          0.45,
          1.2
        )
    });
  }
}


function drawStars(t){

  noStroke();

  for(const star of stars){

    const blink=
      pow(
        max(
          0,
          sin(
            t*
            star.speed+
            star.phase
          )
        ),
        9
      );

    fill(
      245,
      248,
      255,

      star.opacityValue*
      (
        0.12+
        blink*
        0.88
      )
    );

    circle(
      star.x,
      star.y,
      star.d
    );
  }
}


function makeGlints(){

  const count=
    floor(
      constrain(
        (
          width*
          height
        )/
        8500,
        90,
        180
      )
    );

  for(
    let i=0;
    i<count;
    i++
  ){

    glints.push({

      x:
        random(
          width
        ),

      y:
        random(
          waterTop,
          height
        ),

      w:
        random(
          1,
          6.2
        ),

      h:
        random(
          0.3,
          1
        ),

      opacityValue:
        random(
          4,
          18
        ),

      phase:
        random(
          TWO_PI
        )
    });
  }
}


function drawGlints(t){

  noStroke();

  for(const glint of glints){

    const blink=
      pow(
        max(
          0,
          sin(
            t*
            1.2+
            glint.phase
          )
        ),
        7
      );

    fill(
      245,
      250,
      255,

      glint.opacityValue*
      (
        0.08+
        blink*
        0.92
      )
    );

    ellipse(
      glint.x,
      glint.y,

      glint.w*
      (
        0.25+
        blink
      ),

      glint.h
    );
  }
}


function makeFishPath(){

  fishDropPath=
    new Path2D();

  fishDropPath.moveTo(
    0,
    0
  );

  fishDropPath.bezierCurveTo(
    0.42,
    0.18,
    0.62,
    0.60,
    0.48,
    0.84
  );

  fishDropPath.bezierCurveTo(
    0.34,
    1.09,
    0.14,
    1.18,
    0,
    1.18
  );

  fishDropPath.bezierCurveTo(
    -0.14,
    1.18,
    -0.34,
    1.09,
    -0.48,
    0.84
  );

  fishDropPath.bezierCurveTo(
    -0.62,
    0.60,
    -0.42,
    0.18,
    0,
    0
  );

  fishDropPath.closePath();
}


function drawFishLamp(
  x,
  y,
  rotationValue,
  opacityValue,
  glowStrength,
  sizeFactor
){

  const ctx=
    drawingContext;

  ctx.save();

  ctx.translate(
    x,
    y
  );

  ctx.rotate(
    rotationValue
  );

  ctx.save();

  ctx.scale(
    fishSizePx*
    sizeFactor*
    1.35,

    fishSizePx*
    sizeFactor*
    1.35
  );

  ctx.globalAlpha=
    constrain(
      (
        opacityValue/
        255
      )*
      glowStrength*
      0.18,

      0,
      1
    );

  ctx.fillStyle=
    "rgb(220,238,255)";

  ctx.fill(
    fishDropPath
  );

  ctx.restore();

  ctx.scale(
    fishSizePx*
    sizeFactor,

    fishSizePx*
    sizeFactor
  );

  ctx.globalAlpha=
    constrain(
      opacityValue/
      255,
      0,
      1
    );

  ctx.fillStyle=
    "rgb(248,251,255)";

  ctx.fill(
    fishDropPath
  );

  ctx.restore();
}


function makeNet(){

  for(
    let i=0;
    i<TOP_COUNT;
    i++
  ){

    const x=
      width*
      (
        i+
        0.5+
        random(
          -0.14,
          0.14
        )
      )/
      TOP_COUNT;

    const y=
      netTop+
      random(
        -4,
        10
      );

    const node=
      new NetNode(
        x,
        y,
        false,
        "top"
      );

    topNodes.push(
      node
    );

    nodes.push(
      node
    );
  }


  for(
    let row=0;
    row<INTERIOR_ROWS;
    row++
  ){

    const yBase=
      lerp(
        netTop+
        height*
        0.025,

        height*
        0.95,

        row/
        (
          INTERIOR_ROWS-
          1
        )
      );

    const rowCount=
      floor(
        lerp(
          25,
          18,

          row/
          (
            INTERIOR_ROWS-
            1
          )
        )+
        random(
          -1.5,
          1.5
        )
      );

    const rowNodes=[];

    for(
      let col=0;
      col<rowCount;
      col++
    ){

      const xBase=
        width*
        (
          col+
          0.5
        )/
        rowCount;

      const x=
        constrain(
          xBase+
          random(
            -width*
            0.020,

            width*
            0.020
          ),

          width*
          0.02,

          width*
          0.98
        );

      const y=
        constrain(
          yBase+
          random(
            -height*
            0.016,

            height*
            0.016
          ),

          netTop+
          4,

          height*
          0.97
        );

      const node=
        new NetNode(
          x,
          y,
          false,
          "interior"
        );

      nodes.push(
        node
      );

      rowNodes.push(
        node
      );
    }

    rowNodes.sort(
      (a,b)=>
        a.original.x-
        b.original.x
    );

    interiorRowGroups.push(
      rowNodes
    );
  }


  for(
    let i=0;
    i<EXTRA_INTERIOR_COUNT;
    i++
  ){

    let x=
      random(
        width*
        0.025,

        width*
        0.975
      );

    const y=
      random(
        netTop+
        height*
        0.02,

        height*
        0.97
      );

    if(random()<0.34){

      x=
        width*
        constrain(
          randomGaussian(
            0.55,
            0.22
          ),
          0.03,
          0.97
        );
    }

    nodes.push(
      new NetNode(
        x,
        y,
        false,
        "interior"
      )
    );
  }


  for(
    let i=0;
    i<SIDE_COUNT;
    i++
  ){

    const yLeft=
      lerp(
        netTop,
        height,

        i/
        (
          SIDE_COUNT-
          1
        )
      )+
      random(
        -8,
        8
      );

    const leftNode=
      new NetNode(
        0,

        constrain(
          yLeft,
          netTop,
          height
        ),

        true,
        "left"
      );

    leftNodes.push(
      leftNode
    );

    nodes.push(
      leftNode
    );


    const yRight=
      lerp(
        netTop,
        height,

        i/
        (
          SIDE_COUNT-
          1
        )
      )+
      random(
        -8,
        8
      );

    const rightNode=
      new NetNode(
        width,

        constrain(
          yRight,
          netTop,
          height
        ),

        true,
        "right"
      );

    rightNodes.push(
      rightNode
    );

    nodes.push(
      rightNode
    );
  }


  for(
    let i=0;
    i<BOTTOM_COUNT;
    i++
  ){

    const x=
      width*
      (
        i+
        random(
          -0.14,
          0.14
        )
      )/
      (
        BOTTOM_COUNT-
        1
      );

    const bottomNode=
      new NetNode(

        constrain(
          x,
          0,
          width
        ),

        height,
        true,
        "bottom"
      );

    bottomNodes.push(
      bottomNode
    );

    nodes.push(
      bottomNode
    );
  }


  connectChain(
    topNodes,
    false
  );

  connectChain(
    leftNodes,
    false
  );

  connectChain(
    rightNodes,
    false
  );

  connectChain(
    bottomNodes,
    false
  );


  const maxLink=
    min(
      width,
      height
    )*
    0.14;


  for(const node of nodes){

    const nearby=[];

    for(const other of nodes){

      if(other===node){
        continue;
      }

      const distanceValue=
        dist(
          node.original.x,
          node.original.y,
          other.original.x,
          other.original.y
        );

      if(
        distanceValue<
        maxLink
      ){

        nearby.push({
          node:other,
          d:distanceValue
        });
      }
    }

    nearby.sort(
      (a,b)=>
        a.d-
        b.d
    );

    const desired=
      floor(
        random(
          4,
          7
        )
      );

    let added=0;

    for(
      let i=0;
      i<nearby.length &&
      added<desired;
      i++
    ){

      const chance=
        mapValue(
          i,
          0,
          max(
            1,
            nearby.length-
            1
          ),
          0.96,
          0.22
        );

      if(
        random()<chance &&
        addEdge(
          node,
          nearby[i].node,
          false,
          false
        )
      ){
        added++;
      }
    }
  }


  for(const node of nodes){

    if(
      node.links.length>=4
    ){
      continue;
    }

    const nearby=[];

    for(const other of nodes){

      if(other===node){
        continue;
      }

      const distanceValue=
        dist(
          node.original.x,
          node.original.y,
          other.original.x,
          other.original.y
        );

      if(
        distanceValue<
        maxLink*
        1.15
      ){

        nearby.push({
          node:other,
          d:distanceValue
        });
      }
    }

    nearby.sort(
      (a,b)=>
        a.d-
        b.d
    );

    for(
      let i=0;
      i<nearby.length &&
      node.links.length<4;
      i++
    ){

      addEdge(
        node,
        nearby[i].node,
        false,
        false
      );
    }
  }


  for(
    let i=0;
    i<100;
    i++
  ){

    const nodeA=
      random(
        nodes
      );

    const nodeB=
      random(
        nodes
      );

    if(nodeA===nodeB){
      continue;
    }

    const distanceValue=
      dist(
        nodeA.original.x,
        nodeA.original.y,
        nodeB.original.x,
        nodeB.original.y
      );

    if(
      distanceValue<
      min(
        width,
        height
      )*
      0.23
    ){

      addEdge(
        nodeA,
        nodeB,
        false,
        false
      );
    }
  }


  for(const node of nodes){

    node.initialDegree=
      node.links.length;

    if(
      !node.fixed &&
      node.links.length<2
    ){

      node.hasScale=
        false;
    }
  }
}


function addHorizontalReinforcementEdges(){

  for(
    let i=0;
    i<topNodes.length-1;
    i++
  ){

    addEdge(
      topNodes[i],
      topNodes[i+1],
      false,
      true
    );
  }


  for(
    let rowIndex=0;
    rowIndex<interiorRowGroups.length;
    rowIndex++
  ){

    const rowNodes=
      interiorRowGroups[
        rowIndex
      ];

    for(
      let i=0;
      i<rowNodes.length-1;
      i++
    ){

      const nodeA=
        rowNodes[i];

      const nodeB=
        rowNodes[i+1];

      const dx=
        abs(
          nodeB.original.x-
          nodeA.original.x
        );

      const dy=
        abs(
          nodeB.original.y-
          nodeA.original.y
        );

      if(
        dx<
        width*
        0.095 &&

        dy<
        height*
        0.055 &&

        random()<0.93
      ){

        addEdge(
          nodeA,
          nodeB,
          false,
          true
        );
      }
    }


    for(
      let i=0;
      i<rowNodes.length-2;
      i+=2
    ){

      if(random()>0.72){
        continue;
      }

      const nodeA=
        rowNodes[i];

      const nodeB=
        rowNodes[i+2];

      const dx=
        abs(
          nodeB.original.x-
          nodeA.original.x
        );

      const dy=
        abs(
          nodeB.original.y-
          nodeA.original.y
        );

      if(
        dx>
        width*
        0.055 &&

        dx<
        width*
        0.17 &&

        dy<
        height*
        0.065
      ){

        addEdge(
          nodeA,
          nodeB,
          false,
          true
        );
      }
    }


    for(
      let i=
        rowIndex%
        3;

      i<
      rowNodes.length-
      3;

      i+=4
    ){

      if(random()>0.58){
        continue;
      }

      const nodeA=
        rowNodes[i];

      const nodeB=
        rowNodes[i+3];

      const dx=
        abs(
          nodeB.original.x-
          nodeA.original.x
        );

      const dy=
        abs(
          nodeB.original.y-
          nodeA.original.y
        );

      if(
        dx>
        width*
        0.085 &&

        dx<
        width*
        0.23 &&

        dy<
        height*
        0.075
      ){

        addEdge(
          nodeA,
          nodeB,
          false,
          true
        );
      }
    }
  }


  const movable=
    nodes.filter(
      node=>
        !node.fixed &&
        node.edgeType===
        "interior"
    );

  const bandCount=10;

  for(
    let bandIndex=0;
    bandIndex<bandCount;
    bandIndex++
  ){

    const centerY=
      lerp(
        netTop+
        height*
        0.03,

        height*
        0.90,

        bandIndex/
        (
          bandCount-
          1
        )
      );

    const bandNodes=
      movable
        .filter(
          node=>
            abs(
              node.original.y-
              centerY
            )<
            height*
            0.028
        )
        .sort(
          (a,b)=>
            a.original.x-
            b.original.x
        );

    for(
      let i=0;
      i<bandNodes.length-2;
      i+=3
    ){

      const nodeA=
        bandNodes[i];

      const nodeB=
        bandNodes[i+2];

      const dx=
        abs(
          nodeB.original.x-
          nodeA.original.x
        );

      const dy=
        abs(
          nodeB.original.y-
          nodeA.original.y
        );

      if(
        dx>
        width*
        0.06 &&

        dx<
        width*
        0.20 &&

        dy<
        height*
        0.05
      ){

        addEdge(
          nodeA,
          nodeB,
          false,
          true
        );
      }
    }
  }


  for(const node of nodes){

    node.initialDegree=
      node.links.length;
  }
}


function connectChain(
  list,
  persistentFlag
){

  for(
    let i=0;
    i<list.length-1;
    i++
  ){

    addEdge(
      list[i],
      list[i+1],
      persistentFlag,
      false
    );
  }
}


function chooseMoonCoreTwentyPercent(){

  moonCore=[];

  const candidates=
    nodes.filter(
      node=>
        !node.fixed &&
        node.hasScale
    );

  if(
    candidates.length===0
  ){
    return;
  }

  const sortedByDistance=
    candidates
      .slice()
      .sort(
        (a,b)=>{

          const distanceA=
            dist(
              a.original.x,
              a.original.y,
              gatherCenter.x,
              gatherCenter.y
            );

          const distanceB=
            dist(
              b.original.x,
              b.original.y,
              gatherCenter.x,
              gatherCenter.y
            );

          return(
            distanceA-
            distanceB
          );
        }
      );

  const totalCount=
    max(
      12,
      floor(
        candidates.length*
        0.20
      )
    );

  const nearBandEnd=
    floor(
      sortedByDistance.length*
      0.45
    );

  const midBandEnd=
    floor(
      sortedByDistance.length*
      0.75
    );

  const nearBand=
    sortedByDistance.slice(
      0,
      nearBandEnd
    );

  const midBand=
    sortedByDistance.slice(
      nearBandEnd,
      midBandEnd
    );

  const farBand=
    sortedByDistance.slice(
      midBandEnd
    );

  const selected=[];

  selected.push(
    ...takeRandomItems(
      nearBand,
      floor(
        totalCount*
        0.55
      )
    )
  );

  selected.push(
    ...takeRandomItems(
      midBand,
      floor(
        totalCount*
        0.30
      )
    )
  );

  selected.push(
    ...takeRandomItems(
      farBand,

      totalCount-
      floor(
        totalCount*
        0.55
      )-
      floor(
        totalCount*
        0.30
      )
    )
  );

  while(
    selected.length<
    totalCount
  ){

    const remaining=
      candidates.filter(
        node=>
          !selected.includes(
            node
          )
      );

    if(
      remaining.length===0
    ){
      break;
    }

    selected.push(
      random(
        remaining
      )
    );
  }


  const boundaryCount=
    min(
      max(
        18,
        floor(
          selected.length*
          0.25
        )
      ),

      max(
        18,
        floor(
          selected.length*
          0.38
        )
      )
    );

  const interiorCount=
    max(
      1,
      selected.length-
      boundaryCount
    );


  for(
    let i=0;
    i<selected.length;
    i++
  ){

    const node=
      selected[i];

    node.isMoonCore=
      true;

    if(
      i<
      boundaryCount
    ){

      const angleValue=
        TWO_PI*
        i/
        boundaryCount+
        random(
          -0.035,
          0.035
        );

      const radiusValue=
        moonRadius*
        random(
          0.90,
          0.985
        );

      node.coreOffsetX=
        cos(
          angleValue
        )*
        radiusValue;

      node.coreOffsetY=
        sin(
          angleValue
        )*
        radiusValue;

      node.coreLayer=1;

    }else{

      const localIndex=
        i-
        boundaryCount;

      const ratioValue=
        (
          localIndex+
          0.5
        )/
        interiorCount;

      const angleValue=
        localIndex*
        GOLDEN_ANGLE+
        random(
          -0.10,
          0.10
        );

      const radiusValue=
        moonRadius*
        0.86*
        sqrt(
          ratioValue
        )*
        random(
          0.93,
          1.03
        );

      node.coreOffsetX=
        cos(
          angleValue
        )*
        radiusValue;

      node.coreOffsetY=
        sin(
          angleValue
        )*
        radiusValue;

      node.coreLayer=0;
    }

    moonCore.push(
      node
    );
  }
}


function takeRandomItems(
  source,
  count
){

  const copy=
    source.slice();

  const result=[];

  const need=
    min(
      count,
      copy.length
    );

  for(
    let i=0;
    i<need;
    i++
  ){

    const indexValue=
      floor(
        random(
          copy.length
        )
      );

    result.push(
      copy[
        indexValue
      ]
    );

    copy.splice(
      indexValue,
      1
    );
  }

  return result;
}


class NetNode{

  constructor(
    x,
    y,
    fixed,
    edgeType
  ){

    this.original=
      createVector(
        x,
        y
      );

    this.pos=
      this.original.copy();

    this.vel=
      createVector(
        0,
        0
      );

    this.forceX=0;
    this.forceY=0;

    this.fixed=fixed;
    this.edgeType=edgeType;

    this.links=[];
    this.initialDegree=0;

    this.isMoonCore=false;

    this.coreOffsetX=0;
    this.coreOffsetY=0;
    this.coreLayer=0;

    this.depth=
      constrain(
        (
          y-
          netTop
        )/
        (
          height-
          netTop
        ),
        0,
        1
      );

    const pathDistance=
      distanceToMoonPath(
        x,
        y
      );

    if(
      pathDistance<
      moonRadius*
      1.8
    ){

      this.stretchFactor=
        random(
          10,
          15
        );

    }else if(
      pathDistance<
      moonRadius*
      3.1
    ){

      this.stretchFactor=
        random(
          8,
          10
        );

    }else if(
      pathDistance<
      moonRadius*
      4.9
    ){

      this.stretchFactor=
        random(
          4,
          8
        );

    }else{

      this.stretchFactor=
        random(
          3,
          5
        );
    }

    this.weight=
      lerp(
        1.55,
        0.42,

        constrain(
          (
            this.stretchFactor-
            3
          )/
          12,

          0,
          1
        )
      )*
      lerp(
        0.82,
        1.72,
        this.depth
      );

    const densityValue=
      noise(
        x*
        0.0034,
        y*
        0.0042
      );

    this.hasScale=
      !fixed &&
      random()<
      mapValue(
        densityValue,
        0,
        1,
        0.79,
        0.995
      );

    this.scaleDetached=false;

    this.scalePhase=
      random(
        TWO_PI
      );

    this.scaleSpeed=
      random(
        0.018,
        0.036
      );

    this.scaleOpacity=
      random(
        175,
        255
      );

    this.swingPhase=
      random(
        TWO_PI
      );

    this.swingSpeed=
      random(
        0.010,
        0.022
      );

    this.swingAngle=
      random(
        0.025,
        0.075
      );

    this.windPhase=
      random(
        TWO_PI
      );

    this.windFlutter=
      random(
        0.82,
        1.18
      );

    this.detachEarliest=
      lerp(
        28,
        16,
        this.depth
      )+
      random(
        0,
        3
      );

    this.forceDetachTime=
      this.detachEarliest+
      random(
        5,
        8
      );

    this.detachTrigger=
      random(
        0.18,
        0.92
      );

    this.earlyDropEligible=
      !fixed &&
      random()<0.10;

    this.earlyDropTime=
      random(
        GUST_START+
        2.0,
        RISE_START+
        1.2
      );

    this.earlyDropThreshold=
      random(
        0.025,
        0.065
      );

    this.introRevealAt=
      INTRO_DURATION;

    this.introTwinklePhase=
      random(
        TWO_PI
      );

    this.introTwinkleSpeed=
      random(
        2.0,
        4.8
      );

    this.ridgeNode=false;

    this.ridgeTarget=null;

    this.ridgeStart=Infinity;

    this.ridgeReleaseTime=
      random(
        34,
        42
      );
  }
}


function stepNetwork(
  t,
  moon
){

  if(t<GUST_START){

    for(const node of nodes){

      node.pos.set(
        node.original
      );

      node.vel.set(
        0,
        0
      );
    }

    return;
  }

  resetForces();

  if(t<RISE_START){

    applyWindForces(
      t,
      moon
    );

  }else{

    applyRiseForces(
      t,
      moon
    );
  }

  for(
    let i=0;
    i<3;
    i++
  ){

    applySpringForces(
      0.42
    );
  }

  applyRidgeForces(t);
  integrateNodes(t);
}


function resetForces(){

  for(const node of nodes){

    node.forceX=0;
    node.forceY=0;
  }
}


function applyWindForces(
  t,
  moon
){

  const gust=
    moon.gust;

  const gatherRange=
    max(
      width,
      height
    )*
    1.05;

  for(const node of nodes){

    if(node.fixed){
      continue;
    }

    const dx=
      gatherCenter.x-
      node.pos.x;

    const dy=
      gatherCenter.y-
      node.pos.y;

    const distanceValue=
      max(
        1,
        sqrt(
          dx*dx+
          dy*dy
        )
      );

    const localField=
      pow(
        constrain(
          1-
          distanceValue/
          gatherRange,
          0,
          1
        ),
        0.72
      );

    const pulse=
      0.86+
      0.14*
      sin(
        t*
        3.9+
        node.windPhase
      );

    const inwardForce=
      (
        0.085+
        0.130*
        localField
      )*
      gust*
      pulse*
      node.windFlutter;

    node.forceX+=
      dx/
      distanceValue*
      inwardForce;

    node.forceY+=
      dy/
      distanceValue*
      inwardForce;

    node.forceX+=
      0.040*
      gust;

    node.forceY+=
      -0.010*
      gust;

    node.forceX+=
      sin(
        t*
        4.2+
        node.original.y*
        0.015+
        node.windPhase
      )*
      0.016*
      gust;

    node.forceY+=
      cos(
        t*
        3.6+
        node.original.x*
        0.010+
        node.windPhase
      )*
      0.012*
      gust;

    if(node.isMoonCore){

      const targetX=
        gatherCenter.x+
        node.coreOffsetX;

      const targetY=
        gatherCenter.y+
        node.coreOffsetY;

      const capture=
        gust*
        gust;

      node.forceX+=
        (
          targetX-
          node.pos.x
        )*
        0.0048*
        capture;

      node.forceY+=
        (
          targetY-
          node.pos.y
        )*
        0.0048*
        capture;
    }
  }
}


function applyRiseForces(
  t,
  moon
){

  const rise=
    moon.rise;

  for(const node of nodes){

    if(node.fixed){
      continue;
    }

    if(node.isMoonCore){

      const tighten=
        lerp(
          1.0,
          0.965,
          rise
        );

      const targetX=
        moon.x+
        node.coreOffsetX*
        tighten;

      const targetY=
        moon.y+
        node.coreOffsetY*
        tighten;

      node.forceX+=
        (
          targetX-
          node.pos.x
        )*
        0.0105;

      node.forceY+=
        (
          targetY-
          node.pos.y
        )*
        0.0105;

      continue;
    }

    const dx=
      moon.x-
      node.pos.x;

    const dy=
      moon.y-
      node.pos.y;

    const distanceValue=
      max(
        1,
        sqrt(
          dx*dx+
          dy*dy
        )
      );

    const localField=
      Math.exp(
        -Math.pow(
          abs(
            node.original.x-
            moon.x
          )/
          (
            width*
            0.42
          ),
          1.35
        )
      );

    const globalField=
      0.56+
      0.44*
      localField;

    const mobility=
      lerp(
        1.0,
        0.16,
        pow(
          node.depth,
          1.30
        )
      );

    const pullForce=
      (
        0.042+
        0.075*
        globalField
      )*
      rise*
      mobility;

    node.forceX+=
      dx/
      distanceValue*
      pullForce;

    node.forceY+=
      dy/
      distanceValue*
      pullForce;

    node.forceY-=
      0.048*
      rise*
      globalField*
      mobility;
  }
}


function applySpringForces(
  strengthFactor
){

  const allEdges=
    edges.concat(
      ridgeEdges
    );

  for(const edge of allEdges){

    if(edge.broken){
      continue;
    }

    const nodeA=edge.a;
    const nodeB=edge.b;

    const dx=
      nodeB.pos.x-
      nodeA.pos.x;

    const dy=
      nodeB.pos.y-
      nodeA.pos.y;

    const distanceValue=
      max(
        0.0001,
        sqrt(
          dx*dx+
          dy*dy
        )
      );

    const stretchAmount=
      distanceValue-
      edge.restLength;

    let forceMagnitude;

    if(stretchAmount>=0){

      forceMagnitude=
        stretchAmount*
        (
          edge.persistent
            ?0.011
            :0.009
        )*
        strengthFactor;

    }else{

      forceMagnitude=
        stretchAmount*
        0.0011*
        strengthFactor;
    }

    forceMagnitude=
      constrain(
        forceMagnitude,
        -0.22,
        1.05
      );

    const forceX=
      dx/
      distanceValue*
      forceMagnitude;

    const forceY=
      dy/
      distanceValue*
      forceMagnitude;

    if(!nodeA.fixed){

      nodeA.forceX+=
        forceX;

      nodeA.forceY+=
        forceY;
    }

    if(!nodeB.fixed){

      nodeB.forceX-=
        forceX;

      nodeB.forceY-=
        forceY;
    }
  }
}


function applyRidgeForces(t){

  for(const node of ridgeNodes){

    if(
      !node.ridgeTarget ||
      t<node.ridgeStart ||
      node.fixed
    ){
      continue;
    }

    const ridgeProgress=
      smoothStep01(
        progress01(
          t,
          node.ridgeStart,
          node.ridgeStart+
          5.0
        )
      );

    node.forceX+=
      (
        node.ridgeTarget.x-
        node.pos.x
      )*
      0.0066*
      ridgeProgress;

    node.forceY+=
      (
        node.ridgeTarget.y-
        node.pos.y
      )*
      0.0066*
      ridgeProgress;
  }
}


function integrateNodes(t){

  const damping=
    t<RISE_START
      ?0.925
      :0.914;

  for(const node of nodes){

    if(node.fixed){

      node.pos.set(
        node.original
      );

      node.vel.set(
        0,
        0
      );

      continue;
    }

    const massValue=
      0.68+
      node.weight*
      0.46;

    node.vel.x+=
      node.forceX/
      massValue;

    node.vel.y+=
      node.forceY/
      massValue;

    node.vel.mult(
      damping
    );

    node.vel.limit(
      10.0
    );

    node.pos.add(
      node.vel
    );

    node.pos.x=
      constrain(
        node.pos.x,
        -35,
        width+
        35
      );

    node.pos.y=
      constrain(
        node.pos.y,
        -height*
        0.15,
        height+
        25
      );
  }
}


function addEdge(
  nodeA,
  nodeB,
  persistentFlag,
  reinforcementFlag
){

  if(nodeA===nodeB){
    return false;
  }

  for(const edge of nodeA.links){

    const same=
      (
        edge.a===nodeA &&
        edge.b===nodeB
      ) ||
      (
        edge.a===nodeB &&
        edge.b===nodeA
      );

    if(same){

      if(
        persistentFlag &&
        !edge.persistent
      ){

        promoteEdgeToRidge(
          edge
        );
      }

      if(
        reinforcementFlag &&
        !edge.isReinforcement
      ){

        edge.makeReinforced();
      }

      return false;
    }
  }

  const edge=
    new NetEdge(
      nodeA,
      nodeB,
      persistentFlag,
      reinforcementFlag
    );

  nodeA.links.push(
    edge
  );

  nodeB.links.push(
    edge
  );

  if(persistentFlag){

    ridgeEdges.push(
      edge
    );

  }else{

    edges.push(
      edge
    );
  }

  return true;
}


function promoteEdgeToRidge(edge){

  edge.persistent=
    true;

  const indexValue=
    edges.indexOf(
      edge
    );

  if(indexValue>=0){

    edges.splice(
      indexValue,
      1
    );
  }

  if(
    !ridgeEdges.includes(
      edge
    )
  ){

    ridgeEdges.push(
      edge
    );
  }
}


class NetEdge{

  constructor(
    nodeA,
    nodeB,
    persistentFlag,
    reinforcementFlag
  ){

    this.a=nodeA;
    this.b=nodeB;

    this.persistent=
      persistentFlag;

    this.isReinforcement=
      reinforcementFlag;

    this.restLength=
      p5.Vector.dist(
        nodeA.original,
        nodeB.original
      );

    const dx0=
      nodeB.original.x-
      nodeA.original.x;

    const dy0=
      nodeB.original.y-
      nodeA.original.y;

    const absX=
      abs(dx0);

    const absY=
      abs(dy0);

    this.isHorizontal=
      absX>
      absY*
      1.15;

    this.isVertical=
      absY>
      absX*
      1.35;

    this.damageValue=0;
    this.broken=false;

    this.bucket=
      floor(
        random(
          0,
          3
        )
      );

    if(this.isReinforcement){

      this.makeReinforced();

    }else if(this.isHorizontal){

      this.breakStrain=
        random(
          1.72,
          2.18
        );

      this.damageTarget=
        random(
          0.95,
          1.65
        );

      this.damageRate=
        random(
          0.52,
          0.78
        );

      this.fatigueStart=
        RISE_START+
        random(
          1.5,
          16.0
        );

      this.sagValue=
        random(
          0.07,
          0.16
        );

    }else if(this.isVertical){

      this.breakStrain=
        random(
          1.48,
          1.92
        );

      this.damageTarget=
        random(
          0.70,
          1.30
        );

      this.damageRate=
        random(
          0.60,
          0.92
        );

      this.fatigueStart=
        RISE_START+
        random(
          1.5,
          16.0
        );

      this.sagValue=
        random(
          0.06,
          0.16
        );

    }else{

      this.breakStrain=
        random(
          1.58,
          2.04
        );

      this.damageTarget=
        random(
          0.78,
          1.42
        );

      this.damageRate=
        random(
          0.56,
          0.86
        );

      this.fatigueStart=
        RISE_START+
        random(
          1.5,
          16.0
        );

      this.sagValue=
        random(
          0.06,
          0.18
        );
    }

    if(this.persistent){

      this.sagValue=
        random(
          0.06,
          0.10
        );
    }

    this.biasValue=
      random(
        -0.09,
        0.09
      );
  }


  makeReinforced(){

    this.isReinforcement=
      true;

    this.breakStrain=
      random(
        2.02,
        2.48
      );

    this.damageTarget=
      random(
        1.25,
        1.95
      );

    this.damageRate=
      random(
        0.32,
        0.50
      );

    this.fatigueStart=
      RISE_START+
      random(
        5.0,
        14.5
      );

    this.sagValue=
      random(
        0.085,
        0.17
      );
  }


  update(t){

    if(
      this.persistent ||
      this.broken
    ){
      return;
    }

    if(
      t<BREAK_START ||
      t<this.fatigueStart
    ){
      return;
    }

    const currentLength=
      p5.Vector.dist(
        this.a.pos,
        this.b.pos
      );

    const strain=
      currentLength/
      max(
        1,
        this.restLength
      );

    const secondsValue=
      min(
        deltaTime,
        40
      )/
      1000;

    if(
      strain>
      this.breakStrain
    ){

      const excess=
        strain-
        this.breakStrain;

      this.damageValue+=
        secondsValue*
        this.damageRate*
        (
          0.45+
          excess*
          2.4
        );

    }else{

      this.damageValue=
        max(
          0,
          this.damageValue-
          secondsValue*
          0.08
        );
    }

    if(
      this.damageValue>=
      this.damageTarget
    ){

      this.broken=true;
    }
  }


  getCurveData(){

    const nodeA=
      this.a.pos;

    const nodeB=
      this.b.pos;

    const dx=
      nodeB.x-
      nodeA.x;

    const dy=
      nodeB.y-
      nodeA.y;

    const currentLength=
      sqrt(
        dx*dx+
        dy*dy
      );

    const tension=
      currentLength/
      max(
        1,
        this.restLength
      );

    const sagAmount=
      max(
        this.persistent
          ?1.3
          :1.8,

        this.restLength*
        this.sagValue/
        sqrt(
          max(
            1,
            tension*
            0.62
          )
        )
      );

    let controlX=
      (
        nodeA.x+
        nodeB.x
      )*
      0.5;

    let controlY=
      (
        nodeA.y+
        nodeB.y
      )*
      0.5+
      sagAmount;

    if(
      currentLength>0
    ){

      const normalX=
        -dy/
        currentLength;

      const normalY=
        dx/
        currentLength;

      controlX+=
        normalX*
        this.restLength*
        this.biasValue;

      controlY+=
        normalY*
        this.restLength*
        this.biasValue;
    }

    return{

      ax:
        nodeA.x,

      ay:
        nodeA.y,

      cx:
        controlX,

      cy:
        controlY,

      bx:
        nodeB.x,

      by:
        nodeB.y
    };
  }


  addToPath(ctx){

    if(this.broken){
      return;
    }

    const curve=
      this.getCurveData();

    ctx.moveTo(
      curve.ax,
      curve.ay
    );

    ctx.quadraticCurveTo(
      curve.cx,
      curve.cy,
      curve.bx,
      curve.by
    );
  }
}


function countAliveConnections(node){

  let aliveCount=0;

  for(const edge of node.links){

    if(!edge.broken){
      aliveCount++;
    }
  }

  return aliveCount;
}


function createBrokenStrand(
  edge,
  t
){

  if(
    brokenStrands.length>140
  ){
    return;
  }

  let chanceValue=0.52;

  if(edge.isHorizontal){
    chanceValue=0.78;
  }

  if(edge.isReinforcement){
    chanceValue=0.94;
  }

  if(
    random()>chanceValue
  ){
    return;
  }

  brokenStrands.push(
    new BrokenStrand(
      edge,
      t
    )
  );
}


class BrokenStrand{

  constructor(
    edge,
    bornTime
  ){

    this.bornTime=
      bornTime;

    const aliveA=
      countAliveConnections(
        edge.a
      );

    const aliveB=
      countAliveConnections(
        edge.b
      );

    if(aliveA>aliveB){

      this.anchorNode=
        edge.a;

      this.freeNode=
        edge.b;

    }else if(aliveB>aliveA){

      this.anchorNode=
        edge.b;

      this.freeNode=
        edge.a;

    }else if(random()<0.5){

      this.anchorNode=
        edge.a;

      this.freeNode=
        edge.b;

    }else{

      this.anchorNode=
        edge.b;

      this.freeNode=
        edge.a;
    }

    this.pointA=
      this.anchorNode.pos.copy();

    this.pointB=
      this.freeNode.pos.copy();

    this.velocityA=
      this.anchorNode.vel.copy();

    this.velocityB=
      this.freeNode.vel.copy();

    const dx=
      this.pointA.x-
      this.pointB.x;

    const dy=
      this.pointA.y-
      this.pointB.y;

    const distanceValue=
      max(
        1,
        sqrt(
          dx*dx+
          dy*dy
        )
      );

    const towardAnchorX=
      dx/
      distanceValue;

    const towardAnchorY=
      dy/
      distanceValue;

    const normalX=
      -towardAnchorY;

    const normalY=
      towardAnchorX;

    const recoilStrength=
      edge.isReinforcement
        ?
        random(
          1.25,
          2.45
        )
        :
        random(
          0.85,
          1.85
        );

    const sideWhip=
      random(
        -0.75,
        0.75
      );

    this.velocityB.x+=
      towardAnchorX*
      recoilStrength+
      normalX*
      sideWhip;

    this.velocityB.y+=
      towardAnchorY*
      recoilStrength+
      normalY*
      sideWhip;

    this.velocityB.y-=
      random(
        0.12,
        0.46
      );

    this.originalLength=
      edge.restLength;

    this.targetLength=
      edge.restLength*
      random(
        0.34,
        0.58
      );

    this.springStrength=
      random(
        0.020,
        0.038
      );

    this.gravityValue=
      random(
        0.030,
        0.055
      );

    this.windPhase=
      random(
        TWO_PI
      );

    this.windAmount=
      random(
        0.010,
        0.026
      );

    this.swingAmount=
      random(
        0.08,
        0.18
      );

    this.opacityValue=
      edge.isReinforcement
        ?
        random(
          0.28,
          0.42
        )
        :
        random(
          0.18,
          0.32
        );

    this.lineWidthValue=
      edge.isReinforcement
        ?
        random(
          0.46,
          0.68
        )
        :
        random(
          0.34,
          0.54
        );

    this.willRelease=
      random()<0.30;

    this.releaseDelay=
      random(
        1.8,
        4.2
      );

    this.released=false;

    this.lifeTime=
      random(
        7.0,
        12.5
      );

    this.dead=false;
  }


  update(t){

    if(this.dead){
      return;
    }

    const age=
      t-
      this.bornTime;

    if(
      t>=LINE_FADE_END ||
      age>this.lifeTime
    ){

      this.dead=true;

      return;
    }

    const dt=
      min(
        2,
        deltaTime/
        16.667
      );

    if(!this.released){

      this.pointA.set(
        this.anchorNode.pos
      );

      this.velocityA.set(
        this.anchorNode.vel
      );
    }

    if(
      this.willRelease &&
      !this.released &&
      age>this.releaseDelay
    ){

      this.released=true;

      this.velocityA=
        this.anchorNode.vel.copy();

      this.velocityA.x+=
        random(
          -0.35,
          0.35
        );

      this.velocityA.y+=
        random(
          -0.22,
          0.08
        );
    }

    const windValue=
      sin(
        t*
        2.4+
        this.windPhase
      )*
      this.windAmount;

    if(this.released){

      this.velocityA.x+=
        windValue*
        dt;

      this.velocityA.y+=
        this.gravityValue*
        0.82*
        dt;
    }

    this.velocityB.x+=
      windValue*
      1.18*
      dt;

    this.velocityB.y+=
      this.gravityValue*
      dt;

    const dx=
      this.pointB.x-
      this.pointA.x;

    const dy=
      this.pointB.y-
      this.pointA.y;

    const distanceValue=
      max(
        0.001,
        sqrt(
          dx*dx+
          dy*dy
        )
      );

    const stretchAmount=
      distanceValue-
      this.targetLength;

    if(stretchAmount>0){

      const springForce=
        stretchAmount*
        this.springStrength;

      const forceX=
        dx/
        distanceValue*
        springForce;

      const forceY=
        dy/
        distanceValue*
        springForce;

      this.velocityB.x-=
        forceX*
        dt;

      this.velocityB.y-=
        forceY*
        dt;

      if(this.released){

        this.velocityA.x+=
          forceX*
          dt;

        this.velocityA.y+=
          forceY*
          dt;
      }
    }

    this.velocityA.mult(
      0.976
    );

    this.velocityB.mult(
      0.972
    );

    if(this.released){

      this.pointA.x+=
        this.velocityA.x*
        dt;

      this.pointA.y+=
        this.velocityA.y*
        dt;
    }

    this.pointB.x+=
      this.velocityB.x*
      dt;

    this.pointB.y+=
      this.velocityB.y*
      dt;
  }


  draw(t){

    if(this.dead){
      return;
    }

    const meshFade=
      getMeshFade(t);

    if(meshFade<=0.001){
      return;
    }

    const age=
      t-
      this.bornTime;

    const localFade=
      1-
      smoothStep01(
        constrain(
          age/
          this.lifeTime,
          0,
          1
        )
      );

    const visibleOpacity=
      this.opacityValue*
      meshFade*
      max(
        0.32,
        localFade
      );

    if(visibleOpacity<0.003){
      return;
    }

    const dx=
      this.pointB.x-
      this.pointA.x;

    const dy=
      this.pointB.y-
      this.pointA.y;

    const distanceValue=
      max(
        0.001,
        sqrt(
          dx*dx+
          dy*dy
        )
      );

    const normalX=
      -dy/
      distanceValue;

    const normalY=
      dx/
      distanceValue;

    const relaxProgress=
      smoothStep01(
        constrain(
          age/
          3.2,
          0,
          1
        )
      );

    const flutterValue=
      sin(
        age*
        2.2+
        this.windPhase
      )*
      this.originalLength*
      this.swingAmount*
      (
        0.35+
        relaxProgress*
        0.65
      );

    const sagValue=
      this.originalLength*
      lerp(
        0.035,
        0.20,
        relaxProgress
      )+
      age*
      2.8;

    const controlX=
      (
        this.pointA.x+
        this.pointB.x
      )*
      0.5+
      normalX*
      flutterValue;

    const controlY=
      (
        this.pointA.y+
        this.pointB.y
      )*
      0.5+
      normalY*
      flutterValue+
      sagValue;

    const ctx=
      drawingContext;

    ctx.save();

    ctx.beginPath();

    ctx.moveTo(
      this.pointA.x,
      this.pointA.y
    );

    ctx.quadraticCurveTo(
      controlX,
      controlY,
      this.pointB.x,
      this.pointB.y
    );

    ctx.lineWidth=
      this.lineWidthValue;

    ctx.strokeStyle=
      "rgba(240,248,255,"+
      visibleOpacity+
      ")";

    ctx.lineCap=
      "round";

    ctx.stroke();

    ctx.restore();
  }
}


function updateEdges(t){

  for(const edge of edges){

    const wasBroken=
      edge.broken;

    edge.update(t);

    if(
      !wasBroken &&
      edge.broken
    ){

      createBrokenStrand(
        edge,
        t
      );
    }
  }
}


function updateBrokenStrands(t){

  for(
    let i=
      brokenStrands.length-
      1;

    i>=0;
    i--
  ){

    brokenStrands[i].update(t);

    if(
      brokenStrands[i].dead
    ){

      brokenStrands.splice(
        i,
        1
      );
    }
  }
}


function drawBrokenStrands(t){

  for(const strand of brokenStrands){

    strand.draw(t);
  }
}


function drawNet(
  t,
  moon
){

  const meshFade=
    getMeshFade(t);

  const ctx=
    drawingContext;

  const merge=
    smoothStep01(
      progress01(
        moon.formation,
        0.20,
        0.95
      )
    );

  if(
    t<LINE_FADE_END &&
    meshFade>0.001
  ){

    const opacityLevels=[
      0.13,
      0.20,
      0.28
    ];

    const widths=[
      0.34,
      0.42,
      0.52
    ];

    for(
      let bucket=0;
      bucket<3;
      bucket++
    ){

      ctx.save();
      ctx.beginPath();

      for(const edge of edges){

        if(
          edge.bucket!==bucket
        ){
          continue;
        }

        if(edge.isReinforcement){
          continue;
        }

        if(
          merge>0.2 &&
          edge.a.isMoonCore &&
          edge.b.isMoonCore
        ){
          continue;
        }

        edge.addToPath(
          ctx
        );
      }

      ctx.lineWidth=
        widths[
          bucket
        ];

      ctx.strokeStyle=
        "rgba(235,246,255,"+
        (
          opacityLevels[
            bucket
          ]*
          meshFade
        )+
        ")";

      ctx.lineCap=
        "round";

      ctx.lineJoin=
        "round";

      ctx.stroke();
      ctx.restore();
    }


    ctx.save();
    ctx.beginPath();

    for(const edge of edges){

      if(
        !edge.isReinforcement
      ){
        continue;
      }

      if(
        merge>0.2 &&
        edge.a.isMoonCore &&
        edge.b.isMoonCore
      ){
        continue;
      }

      edge.addToPath(
        ctx
      );
    }

    ctx.lineWidth=
      0.56;

    ctx.strokeStyle=
      "rgba(241,249,255,"+
      (
        0.29*
        meshFade
      )+
      ")";

    ctx.lineCap=
      "round";

    ctx.lineJoin=
      "round";

    ctx.stroke();
    ctx.restore();
  }

  drawRidgeContour(t);
}


function drawRidgeContour(t){

  if(
    ridgeNodes.length<2
  ){
    return;
  }

  const show=
    smoothStep01(
      progress01(
        t,
        26,
        42
      )
    );

  const ridgeOpacity=
    lerp(
      0,
      0.84,
      show
    );

  const ridgeWidth=
    lerp(
      0,
      1.18,
      show
    );

  if(
    ridgeOpacity<=0.001
  ){
    return;
  }

  const points=
    getRidgeContourPoints();

  if(
    points.length<2
  ){
    return;
  }

  const ctx=
    drawingContext;

  ctx.save();

  ctx.beginPath();

  ctx.moveTo(
    points[0].x,
    points[0].y
  );

  for(
    let i=0;
    i<points.length-1;
    i++
  ){

    const pointA=
      points[i];

    const pointB=
      points[i+1];

    const sagValue=
      getRidgeSegmentSag(
        pointA,
        pointB,
        i,
        points.length-1
      );

    const controlX=
      (
        pointA.x+
        pointB.x
      )*
      0.5;

    const controlY=
      max(
        pointA.y,
        pointB.y
      )+
      sagValue;

    ctx.quadraticCurveTo(
      controlX,
      controlY,
      pointB.x,
      pointB.y
    );
  }

  ctx.lineWidth=
    ridgeWidth;

  ctx.strokeStyle=
    "rgba(244,250,255,"+
    ridgeOpacity+
    ")";

  ctx.lineCap=
    "round";

  ctx.lineJoin=
    "round";

  ctx.stroke();
  ctx.restore();
}


function drawAttachedScales(
  t,
  moon
){

  const fade=
    1-
    smoothStep01(
      progress01(
        t,
        SCALE_FADE_START,
        SCALE_FADE_END
      )
    );

  const moonGrowth=
    getMoonGrowthProgress(t);

  for(const node of nodes){

    if(
      !node.hasScale ||
      node.scaleDetached
    ){
      continue;
    }

    let aliveEdges=0;

    for(const edge of node.links){

      if(!edge.broken){
        aliveEdges++;
      }
    }

    if(
      !node.isMoonCore &&
      !node.ridgeNode &&
      aliveEdges<1
    ){
      continue;
    }

    const blinkBase=
      (
        sin(
          frameCount*
          node.scaleSpeed+
          node.scalePhase
        )+
        1
      )*
      0.5;

    const sparkle=
      pow(
        blinkBase,
        4
      );

    const randomBlink=
      noise(
        node.scalePhase*
        7,

        frameCount*
        0.018
      );

    let opacityValue=
      lerp(
        74,
        node.scaleOpacity,

        sparkle*
        0.76+
        randomBlink*
        0.24
      );

    let glowStrength=
      0.22+
      sparkle*
      0.80;

    const sizeFactor=
      1.0;

    let bodyVisible=
      true;

    if(
      !node.ridgeNode &&
      !node.isMoonCore
    ){

      opacityValue*=
        fade;
    }

    let swing=
      sin(
        frameCount*
        node.swingSpeed+
        node.swingPhase
      )*
      node.swingAngle;

    if(node.isMoonCore){

      const gatherProgress=
        smoothStep01(
          progress01(
            t,
            GUST_START,
            GUST_END
          )
        );

      swing*=
        1-
        gatherProgress*
        0.85;

      opacityValue=
        lerp(
          opacityValue,
          220,
          gatherProgress*
          0.25
        );

      glowStrength=
        0.28+
        sparkle*
        0.28+
        gatherProgress*
        0.10;

      const fishFade=
        1-
        smoothStep01(
          progress01(
            moonGrowth,
            0.18,
            0.92
          )
        );

      opacityValue*=
        max(
          0.03,
          fishFade
        );

      if(
        moonGrowth>
        0.985
      ){

        bodyVisible=
          false;
      }
    }

    if(bodyVisible){

      drawFishLamp(
        node.pos.x,
        node.pos.y,
        swing,
        opacityValue,
        glowStrength,
        sizeFactor
      );
    }
  }
}


function drawMoonFusion(
  t,
  moon
){

  const moonGrowth=
    getMoonGrowthProgress(t);

  if(
    t<MOON_GROW_START ||
    moonGrowth<=0.001
  ){
    return;
  }

  const dotAppear=
    smoothStep01(
      progress01(
        t,
        MOON_GROW_START-
        1.0,
        MOON_GROW_START+
        2.5
      )
    );

  const coreRadius=
    lerp(
      moonRadius*
      0.05,
      moonRadius,
      moonGrowth
    );

  if(
    dotAppear>0.001
  ){

    noStroke();

    fill(
      245,
      249,
      255,
      255*
      dotAppear
    );

    circle(
      moon.x,
      moon.y,

      max(
        3,

        moonRadius*
        0.18*
        dotAppear
      )
    );
  }

  const diskOpacity=
    255*
    smoothStep01(
      progress01(
        t,
        MOON_GROW_START,
        MOON_GROW_START+
        3.0
      )
    );

  noStroke();

  fill(
    240,
    247,
    255,
    diskOpacity
  );

  circle(
    moon.x,
    moon.y,
    coreRadius*
    2
  );
}


function updateScaleDrops(t){

  if(
    t<
    GUST_START+
    1.8
  ){
    return;
  }

  for(const node of nodes){

    if(
      !node.hasScale ||
      node.scaleDetached ||
      node.isMoonCore
    ){
      continue;
    }

    if(
      node.earlyDropEligible &&
      !node.ridgeNode &&
      t>=node.earlyDropTime
    ){

      const displacement=
        dist(
          node.pos.x,
          node.pos.y,
          node.original.x,
          node.original.y
        );

      const movementRatio=
        displacement/
        max(
          width,
          height
        );

      if(
        movementRatio>=
        node.earlyDropThreshold
      ){

        node.scaleDetached=
          true;

        fallingScales.push(
          new FallingScale(
            node
          )
        );

        continue;
      }
    }

    if(t<RISE_START){
      continue;
    }

    let alive=0;

    for(const edge of node.links){

      if(!edge.broken){
        alive++;
      }
    }

    if(
      alive===0 &&
      t>
      RISE_START+
      0.5
    ){

      node.scaleDetached=
        true;

      fallingScales.push(
        new FallingScale(
          node
        )
      );

      continue;
    }

    if(node.ridgeNode){

      if(
        t>
        node.ridgeReleaseTime
      ){

        node.scaleDetached=
          true;

        fallingScales.push(
          new FallingScale(
            node
          )
        );
      }

      continue;
    }

    if(
      t<
      node.detachEarliest
    ){
      continue;
    }

    const detachProgress=
      smoothStep01(
        progress01(
          t,
          node.detachEarliest,
          node.forceDetachTime
        )
      );

    const displacement=
      dist(
        node.pos.x,
        node.pos.y,
        node.original.x,
        node.original.y
      );

    const pullAmount=
      constrain(
        displacement/
        (
          height*
          0.12
        ),
        0,
        1
      );

    const releaseValue=
      detachProgress*
      0.84+
      pullAmount*
      0.20;

    if(
      releaseValue>=
      node.detachTrigger ||
      t>=node.forceDetachTime
    ){

      node.scaleDetached=
        true;

      fallingScales.push(
        new FallingScale(
          node
        )
      );
    }
  }
}


class FallingScale{

  constructor(node){

    this.pos=
      node.pos.copy();

    this.vel=
      createVector(
        random(
          -0.28,
          0.28
        ),
        random(
          0.3,
          0.9
        )
      );

    this.mass=
      node.weight;

    this.opacityValue=
      node.scaleOpacity;

    this.phaseValue=
      random(
        TWO_PI
      );

    this.swingValue=
      random(
        -0.05,
        0.05
      );

    this.dead=false;
  }


  update(){

    const dt=
      min(
        2,
        deltaTime/
        16.667
      );

    this.vel.y+=
      (
        0.045+
        this.mass*
        0.031
      )*
      dt;

    this.vel.x+=
      sin(
        frameCount*
        0.016+
        this.phaseValue
      )*
      0.003;

    this.vel.x*=
      0.996;

    this.pos.x+=
      this.vel.x*
      dt;

    this.pos.y+=
      this.vel.y*
      dt;

    this.swingValue=
      sin(
        frameCount*
        0.018+
        this.phaseValue
      )*
      0.045;

    if(
      this.pos.y>=
      height-
      4
    ){

      burstFish(
        this
      );

      this.dead=true;
    }
  }


  draw(){

    drawFishLamp(
      this.pos.x,
      this.pos.y,
      this.swingValue,
      this.opacityValue,
      0.35,
      1.0
    );
  }
}


function updateFallingScales(){

  for(
    let i=
      fallingScales.length-
      1;

    i>=0;
    i--
  ){

    fallingScales[i].update();

    if(
      fallingScales[i].dead
    ){

      fallingScales.splice(
        i,
        1
      );
    }
  }
}


function drawFallingScales(){

  for(const item of fallingScales){

    item.draw();
  }
}


function burstFish(item){

  const count=
    floor(
      random(
        5,
        10
      )
    );

  for(
    let i=0;
    i<count;
    i++
  ){

    fragments.push({

      x:item.pos.x,
      y:item.pos.y,

      vx:
        random(
          -1.4,
          1.4
        ),

      vy:
        random(
          -2.3,
          -0.6
        ),

      d:
        random(
          0.8,
          1.8
        ),

      opacityValue:
        random(
          100,
          190
        )
    });
  }

  ripples.push(
    new WaterRipple(
      item.pos.x,
      height-
      5,

      random(
        12,
        28
      )
    )
  );
}


function burstRidgeDrop(
  x,
  y
){

  const count=
    floor(
      random(
        16,
        28
      )
    );

  for(
    let i=0;
    i<count;
    i++
  ){

    const angleValue=
      random(
        TWO_PI
      );

    const speedValue=
      random(
        0.7,
        2.9
      );

    fragments.push({

      x,
      y,

      vx:
        cos(
          angleValue
        )*
        speedValue,

      vy:
        sin(
          angleValue
        )*
        speedValue-
        random(
          0.4,
          1.8
        ),

      d:
        random(
          1.0,
          2.4
        ),

      opacityValue:
        random(
          140,
          240
        )
    });
  }

  ripples.push(
    new WaterRipple(
      x,
      height-
      5,
      random(
        18,
        42
      )
    )
  );
}


function updateFragments(){

  for(
    let i=
      fragments.length-
      1;

    i>=0;
    i--
  ){

    const part=
      fragments[i];

    part.vy+=
      0.055;

    part.x+=
      part.vx;

    part.y+=
      part.vy;

    part.vx*=
      0.98;

    part.opacityValue*=
      0.94;

    if(
      part.opacityValue<2
    ){

      fragments.splice(
        i,
        1
      );
    }
  }
}


function drawFragments(){

  noStroke();

  for(const part of fragments){

    fill(
      246,
      250,
      255,
      part.opacityValue
    );

    circle(
      part.x,
      part.y,
      part.d
    );
  }
}


class WaterRipple{

  constructor(
    x,
    y,
    rippleWidth
  ){

    this.x=x;
    this.y=y;

    this.w=
      rippleWidth;

    this.opacityValue=
      70;
  }


  update(){

    this.w+=
      0.92;

    this.opacityValue*=
      0.95;
  }


  draw(){

    noStroke();

    fill(
      242,
      249,
      255,
      this.opacityValue*
      0.24
    );

    ellipse(
      this.x,
      this.y,
      this.w,
      2
    );

    fill(
      255,
      255,
      255,
      this.opacityValue*
      0.12
    );

    ellipse(
      this.x,
      this.y,
      this.w*
      0.52,
      0.9
    );
  }
}


function updateRipples(){

  for(
    let i=
      ripples.length-
      1;

    i>=0;
    i--
  ){

    ripples[i].update();

    if(
      ripples[i].opacityValue<1
    ){

      ripples.splice(
        i,
        1
      );
    }
  }
}


function drawRipples(){

  for(const ripple of ripples){

    ripple.draw();
  }
}


function updateRidgeDrops(t){

  const secondsValue=
    min(
      deltaTime,
      40
    )/
    1000;

  if(
    t>=RIDGE_RAIN_START &&
    t<=RIDGE_RAIN_END &&
    ridgeNodes.length>=2
  ){

    const rainProgress=
      smoothStep01(
        progress01(
          t,
          RIDGE_RAIN_START,
          RIDGE_RAIN_END
        )
      );

    const rate=
      lerp(
        24,
        17,
        rainProgress
      );

    ridgeDropAccumulator+=
      rate*
      secondsValue;

    while(
      ridgeDropAccumulator>=1
    ){

      ridgeDropAccumulator--;

      ridgeDrops.push(
        new RidgeDrop(
          sampleRandomRidgePoint()
        )
      );

      if(random()<0.34){

        ridgeDrops.push(
          new RidgeDrop(
            sampleRandomRidgePoint()
          )
        );
      }
    }
  }

  for(
    let i=
      ridgeDrops.length-
      1;

    i>=0;
    i--
  ){

    ridgeDrops[i].update();

    if(
      ridgeDrops[i].dead
    ){

      ridgeDrops.splice(
        i,
        1
      );
    }
  }
}


function sampleRandomRidgePoint(){

  const points=
    getRidgeContourPoints();

  if(points.length<2){

    return{
      x:
        width*
        0.5,

      y:
        height*
        0.78
    };
  }

  const segments=[];

  let totalWeight=0;

  for(
    let i=0;
    i<points.length-1;
    i++
  ){

    const pointA=
      points[i];

    const pointB=
      points[i+1];

    const chord=
      dist(
        pointA.x,
        pointA.y,
        pointB.x,
        pointB.y
      );

    segments.push({

      index:i,

      a:
        pointA,

      b:
        pointB,

      weight:
        chord
    });

    totalWeight+=
      chord;
  }

  let pick=
    random(
      totalWeight
    );

  for(const seg of segments){

    pick-=
      seg.weight;

    if(
      pick<=0
    ){

      const parameterValue=
        random(
          0.02,
          0.98
        );

      const sagValue=
        getRidgeSegmentSag(
          seg.a,
          seg.b,
          seg.index,
          points.length-1
        );

      const controlX=
        (
          seg.a.x+
          seg.b.x
        )*
        0.5;

      const controlY=
        max(
          seg.a.y,
          seg.b.y
        )+
        sagValue;

      return pointOnQuadratic(
        seg.a.x,
        seg.a.y,
        controlX,
        controlY,
        seg.b.x,
        seg.b.y,
        parameterValue
      );
    }
  }

  return{

    x:
      points[
        points.length-
        1
      ].x,

    y:
      points[
        points.length-
        1
      ].y
  };
}


class RidgeDrop{

  constructor(startPoint){

    this.x=
      startPoint.x;

    this.startY=
      startPoint.y;

    this.y=
      startPoint.y;

    this.velY=
      random(
        0.82,
        1.35
      );

    this.acceleration=
      random(
        0.009,
        0.018
      );

    this.headSize=
      random(
        2.8,
        5.3
      );

    this.opacityValue=
      random(
        185,
        255
      );

    this.maxTailLength=
      random(
        height*
        0.28,
        height*
        0.56
      );

    this.tailThickness=
      random(
        0.28,
        0.62
      );

    this.landed=false;
    this.landedAge=0;
    this.dead=false;
  }


  update(){

    const dt=
      min(
        2,
        deltaTime/
        16.667
      );

    const secondsValue=
      min(
        deltaTime,
        40
      )/
      1000;

    if(this.landed){

      this.landedAge+=
        secondsValue;

      if(
        this.landedAge>=3
      ){

        this.dead=true;
      }

      return;
    }

    this.velY+=
      this.acceleration*
      dt;

    this.y+=
      this.velY*
      dt;

    if(
      this.y>=
      height-
      4
    ){

      this.y=
        height-
        4;

      burstRidgeDrop(
        this.x,
        height-
        4
      );

      this.landed=true;
      this.landedAge=0;
    }
  }


  draw(){

    const lingerFade=
      this.landed
        ?
        constrain(
          1-
          this.landedAge/
          3,
          0,
          1
        )
        :
        1;

    const visibleOpacity=
      this.opacityValue*
      lingerFade;

    if(
      visibleOpacity<=
      0.5
    ){
      return;
    }

    const tailEndY=
      this.y;

    const tailStartY=
      max(
        this.startY,
        this.y-
        this.maxTailLength
      );

    const ctx=
      drawingContext;

    ctx.save();

    const trailGradient=
      ctx.createLinearGradient(
        this.x,
        tailStartY,
        this.x,
        tailEndY
      );

    trailGradient.addColorStop(
      0.00,
      "rgba(242,249,255,0.00)"
    );

    trailGradient.addColorStop(
      0.30,
      "rgba(242,249,255,"+
      (
        (
          visibleOpacity/
          255
        )*
        0.18
      )+
      ")"
    );

    trailGradient.addColorStop(
      1.00,
      "rgba(248,252,255,"+
      (
        (
          visibleOpacity/
          255
        )*
        0.88
      )+
      ")"
    );

    ctx.beginPath();

    ctx.moveTo(
      this.x,
      tailStartY
    );

    ctx.lineTo(
      this.x,
      tailEndY
    );

    ctx.lineWidth=
      this.tailThickness;

    ctx.strokeStyle=
      trailGradient;

    ctx.lineCap=
      "round";

    ctx.stroke();

    ctx.restore();

    noStroke();

    fill(
      214,
      235,
      255,
      visibleOpacity*
      0.26
    );

    circle(
      this.x,
      this.y,
      this.headSize*
      2.7
    );

    fill(
      250,
      252,
      255,
      visibleOpacity
    );

    circle(
      this.x,
      this.y,
      this.headSize
    );
  }
}


function drawRidgeDrops(){

  for(const dropItem of ridgeDrops){

    dropItem.draw();
  }
}


function buildMountainRidge(){

  ridgeNodes=[];
  ridgeEdges=[];

  const used=
    new Set();

  const anchorTargets=[
    {
      xNorm:0.12,
      yNorm:0.85
    },
    {
      xNorm:0.27,
      yNorm:0.79
    },
    {
      xNorm:0.47,
      yNorm:0.73
    },
    {
      xNorm:
        moonEnd.x/
        width,
      yNorm:0.62
    },
    {
      xNorm:0.875,
      yNorm:0.75
    }
  ];

  for(const target of anchorTargets){

    const targetX=
      target.xNorm*
      width;

    const targetY=
      target.yNorm*
      height;

    let bestNode=null;
    let bestScore=Infinity;

    for(const node of nodes){

      if(
        node.fixed ||
        node.isMoonCore ||
        used.has(node) ||
        !node.hasScale
      ){
        continue;
      }

      const dx=
        abs(
          node.original.x-
          targetX
        );

      const dy=
        abs(
          node.original.y-
          targetY
        );

      const score=
        dx*
        0.95+
        dy*
        1.25;

      if(
        score<
        bestScore
      ){

        bestScore=
          score;

        bestNode=
          node;
      }
    }

    if(bestNode){

      bestNode.ridgeNode=
        true;

      bestNode.ridgeTarget=
        createVector(
          targetX,
          targetY
        );

      bestNode.ridgeStart=
        random(
          21,
          25
        );

      ridgeNodes.push(
        bestNode
      );

      used.add(
        bestNode
      );
    }
  }

  ridgeNodes.sort(
    (a,b)=>
      a.ridgeTarget.x-
      b.ridgeTarget.x
  );

  for(
    let i=0;
    i<ridgeNodes.length-1;
    i++
  ){

    addEdge(
      ridgeNodes[i],
      ridgeNodes[i+1],
      true,
      false
    );
  }
}


function getRidgeContourPoints(){

  return[
    {
      x:0,
      y:height*0.755
    },
    {
      x:width*0.295,
      y:height*0.720
    },
    {
      x:width*0.485,
      y:height*0.555
    },
    {
      x:width*0.615,
      y:height*0.545
    },
    {
      x:width*0.810,
      y:height*0.425
    },
    {
      x:width*0.950,
      y:height*0.615
    },
    {
      x:width*0.975,
      y:height*0.600
    },
    {
      x:width,
      y:height*0.645
    }
  ];
}


function getRidgeSegmentSag(
  pointA,
  pointB,
  indexValue,
  totalSegmentCount
){

  const chord=
    dist(
      pointA.x,
      pointA.y,
      pointB.x,
      pointB.y
    );

  let sagValue=
    mapValue(
      chord,
      width*
      0.08,
      width*
      0.32,
      height*
      0.040,
      height*
      0.095
    );

  const centerBoost=
    sin(
      (
        (
          indexValue+
          0.5
        )/
        max(
          1,
          totalSegmentCount
        )
      )*
      PI
    );

  sagValue+=
    centerBoost*
    height*
    0.014;

  return sagValue;
}


function pointOnQuadratic(
  ax,
  ay,
  cx,
  cy,
  bx,
  by,
  parameterValue
){

  const u=
    1-
    parameterValue;

  return{

    x:
      u*
      u*
      ax+
      2*
      u*
      parameterValue*
      cx+
      parameterValue*
      parameterValue*
      bx,

    y:
      u*
      u*
      ay+
      2*
      u*
      parameterValue*
      cy+
      parameterValue*
      parameterValue*
      by
  };
}


function distanceToMoonPath(
  x,
  y
){

  let best=
    Infinity;

  for(
    let i=0;
    i<=24;
    i++
  ){

    const progressValue=
      i/24;

    const eased=
      easeInOutCubic(
        progressValue
      );

    const moonX=
      lerp(
        moonStart.x,
        moonEnd.x,
        eased
      );

    const moonY=
      lerp(
        moonStart.y,
        moonEnd.y,
        eased
      );

    best=
      min(
        best,

        dist(
          x,
          y,
          moonX,
          moonY
        )
      );
  }

  return best;
}


function progress01(
  t,
  startValue,
  endValue
){

  return constrain(
    (
      t-
      startValue
    )/
    (
      endValue-
      startValue
    ),
    0,
    1
  );
}


function smoothStep01(value){

  const x=
    constrain(
      value,
      0,
      1
    );

  return(
    x*
    x*
    (
      3-
      2*
      x
    )
  );
}


function easeInOutCubic(value){

  const x=
    constrain(
      value,
      0,
      1
    );

  return(
    x<0.5
      ?
      4*
      x*
      x*
      x
      :
      1-
      pow(
        -2*
        x+
        2,
        3
      )/
      2
  );
}


function mapValue(
  value,
  sourceMin,
  sourceMax,
  targetMin,
  targetMax
){

  const ratioValue=
    (
      value-
      sourceMin
    )/
    (
      sourceMax-
      sourceMin
    );

  return lerp(
    targetMin,
    targetMax,
    ratioValue
  );
}


function keyPressed(){

  if(
    key==="r" ||
    key==="R"
  ){

    resetScene();
  }

  if(
    key==="n" ||
    key==="N"
  ){

    seedValue=
      floor(
        random(
          1,
          9999999
        )
      );

    resetScene();
  }
}


function windowResized(){

  const viewport=
    getViewportSize();

  const portraitNow=
    viewport.h>=
    viewport.w;

  const widthChange=
    abs(
      viewport.w-
      stableViewportWidth
    );

  const heightChange=
    abs(
      viewport.h-
      stableViewportHeight
    );

  const orientationChanged=
    portraitNow!==
    stablePortrait;

  // 手机浏览器地址栏的小幅变化，不重置动画
  if(
    !orientationChanged &&
    widthChange<16 &&
    heightChange<120
  ){
    return;
  }

  stableViewportWidth=
    viewport.w;

  stableViewportHeight=
    viewport.h;

  stablePortrait=
    portraitNow;

  const canvasSize=
    getCanvasSize(
      viewport
    );

  resizeCanvas(
    canvasSize.w,
    canvasSize.h
  );

  if(
    mainCanvas &&
    mainCanvas.elt
  ){

    mainCanvas.elt.style.width=
      canvasSize.w+"px";

    mainCanvas.elt.style.height=
      canvasSize.h+"px";

    mainCanvas.elt.style.maxWidth=
      "100vw";
  }

  resetScene();
}


function touchMoved(){
  return true;
}