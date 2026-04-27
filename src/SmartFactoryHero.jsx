"use client";

// SmartFactoryHero — 3D smart factory animation for portfolio hero section
// Stack: React 18+, Three.js, GSAP

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";

const DEFAULT_PALETTE = {
  background: "#08060f",
  idle: 0x3a2a5c,
  idleEdge: 0x5a3f8a,
  active: 0xb289ff,
  activeEdge: 0xe0c8ff,
  hot: 0xd4a5ff,
  accent: 0x8a5fdf,
  ground: 0x120a24,
  particle: 0xc895ff,
  hudPrimary: "#E8DFFF",
  hudAccent: "#B289FF",
  hudMuted: "#8a5fdf",
};

export default function SmartFactoryHero({
  height = 600,
  palette: paletteProp = {},
  showHUD = true,
  enableOrbit = true,
  orbitSpeed = 0.04,
  pixelRatioCap = 2,
  className = "",
  style = {},
}) {
  const palette = { ...DEFAULT_PALETTE, ...paletteProp };

  const containerRef = useRef(null);
  const canvasWrapRef = useRef(null);

  const hudRefs = {
    oee: useRef(null),
    thr: useRef(null),
    lat: useRef(null),
    phase: useRef(null),
    phaseDetail: useRef(null),
    log: useRef(null),
    sparkPath: useRef(null),
    sparkArea: useRef(null),
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !canvasWrapRef.current) return;

    const wrap = canvasWrapRef.current;
    let W = wrap.clientWidth;
    let H = wrap.clientHeight;

    // ============ LAYOUT CONSTANTS ============
    const BELT1_Z = -3;
    const BELT2_Z = 3;
    const BELT1_MIN_X = -14;
    const BELT1_MAX_X = 4;
    const BELT2_MIN_X = 8;
    const BELT2_MAX_X = 18;
    const ROBOT_X = 6;
    const PICK_POS = new THREE.Vector3(BELT1_MAX_X - 0.8, 1.0, BELT1_Z);
    const PLACE_POS = new THREE.Vector3(BELT2_MIN_X + 0.6, 1.1, BELT2_Z);

    // ============ SCENE SETUP ============
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      parseInt(palette.background.replace("#", ""), 16),
      0.018
    );

    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    wrap.appendChild(renderer.domElement);

    // ============ GROUND + GRID ============
    const groundGeo = new THREE.PlaneGeometry(80, 80, 40, 40);
    const groundMat = new THREE.MeshBasicMaterial({
      color: palette.ground,
      transparent: true,
      opacity: 0.6,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(80, 40, 0x6a3fbf, 0x2a1a4a);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.25;
    scene.add(gridHelper);

    scene.add(new THREE.AmbientLight(0x8060c0, 0.6));
    const keyLight = new THREE.DirectionalLight(palette.active, 0.4);
    keyLight.position.set(10, 20, 10);
    scene.add(keyLight);

    // ============ HELPERS ============
    const disposables = [];

    function makeBox(w, h, d, opts = {}) {
      const g = new THREE.BoxGeometry(w, h, d);
      const fillMat = new THREE.MeshBasicMaterial({
        color: opts.fill ?? palette.idle,
        transparent: true,
        opacity: opts.fillOpacity ?? 0.35,
      });
      const mesh = new THREE.Mesh(g, fillMat);
      const edges = new THREE.EdgesGeometry(g);
      const edgeMat = new THREE.LineBasicMaterial({
        color: opts.edge ?? palette.idleEdge,
        transparent: true,
        opacity: opts.edgeOpacity ?? 0.9,
      });
      const line = new THREE.LineSegments(edges, edgeMat);
      const group = new THREE.Group();
      group.add(mesh);
      group.add(line);
      group.userData = { fillMat, edgeMat };
      disposables.push(g, edges, fillMat, edgeMat);
      return group;
    }

    function makeCyl(r, h, opts = {}) {
      const g = new THREE.CylinderGeometry(r, r, h, 12);
      const fillMat = new THREE.MeshBasicMaterial({
        color: opts.fill ?? palette.idle,
        transparent: true,
        opacity: opts.fillOpacity ?? 0.35,
      });
      const mesh = new THREE.Mesh(g, fillMat);
      const edges = new THREE.EdgesGeometry(g);
      const edgeMat = new THREE.LineBasicMaterial({
        color: opts.edge ?? palette.idleEdge,
        transparent: true,
        opacity: opts.edgeOpacity ?? 0.9,
      });
      const line = new THREE.LineSegments(edges, edgeMat);
      const group = new THREE.Group();
      group.add(mesh);
      group.add(line);
      group.userData = { fillMat, edgeMat };
      disposables.push(g, edges, fillMat, edgeMat);
      return group;
    }

    const machines = [];
    const factory = new THREE.Group();
    scene.add(factory);

    // ============ CNC PRESS ============
    [-12].forEach((x) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(3.5, 0);
      shape.lineTo(3.5, 0.4);
      shape.lineTo(1.0, 0.4);
      shape.lineTo(1.0, 2.2);
      shape.lineTo(3.4, 2.2);
      shape.lineTo(3.4, 2.8);
      shape.lineTo(0, 2.8);
      shape.lineTo(0, 0);

      const extrudeSettings = { depth: 2.4, bevelEnabled: false };
      const cGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      cGeo.center();

      const fillMat = new THREE.MeshBasicMaterial({
        color: 0x2a1a4a,
        transparent: true,
        opacity: 0.35,
      });
      const cMesh = new THREE.Mesh(cGeo, fillMat);

      const edges = new THREE.EdgesGeometry(cGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: palette.idleEdge,
        transparent: true,
        opacity: 0.9,
      });
      const cLine = new THREE.LineSegments(edges, edgeMat);

      const machineGroup = new THREE.Group();
      machineGroup.add(cMesh);
      machineGroup.add(cLine);
      machineGroup.rotation.y = -Math.PI / 2;
      machineGroup.position.set(x, 1.4, -3.45);
      machineGroup.userData = { fillMat, edgeMat };
      factory.add(machineGroup);
      machines.push(machineGroup);
      disposables.push(cGeo, edges, fillMat, edgeMat);

      const head = makeBox(0.25, 1.0, 0.25, {
        fill: palette.active,
        edge: palette.activeEdge,
        fillOpacity: 0.3,
      });
      const baseY = 2.2;
      head.position.set(x, baseY, -3);
      head.userData.toolhead = true;
      head.userData.baseY = baseY;
      factory.add(head);
      machines.push(head);

      const disp = makeBox(1.0, 0.4, 0.1, {
        fill: palette.active,
        edge: palette.activeEdge,
        fillOpacity: 0.2,
      });
      disp.position.set(x, 1.8, -4.25);
      factory.add(disp);
      machines.push(disp);
    });

    // ============ BELT 1 ============
    const belt1Len = BELT1_MAX_X - BELT1_MIN_X;
    const belt1CenterX = (BELT1_MIN_X + BELT1_MAX_X) / 2;
    const belt1Geo = new THREE.BoxGeometry(belt1Len, 0.2, 1.4);
    const belt1Mat = new THREE.MeshBasicMaterial({
      color: 0x2a1a4a,
      transparent: true,
    });
    const belt1 = new THREE.Mesh(belt1Geo, belt1Mat);
    belt1.position.set(belt1CenterX, 0.7, BELT1_Z);
    factory.add(belt1);
    const belt1EdgeGeo = new THREE.EdgesGeometry(belt1Geo);
    const belt1EdgeMat = new THREE.LineBasicMaterial({
      color: palette.idleEdge,
      transparent: true,
      opacity: 0.8,
    });
    const belt1Edges = new THREE.LineSegments(belt1EdgeGeo, belt1EdgeMat);
    belt1Edges.position.copy(belt1.position);
    factory.add(belt1Edges);
    disposables.push(belt1Geo, belt1EdgeGeo, belt1Mat, belt1EdgeMat);

    for (let lx = BELT1_MIN_X + 0.5; lx <= BELT1_MAX_X; lx += 4.2) {
      const leg = makeCyl(0.1, 0.6, { fill: 0x3a2a5c, fillOpacity: 0.8 });
      leg.position.set(lx, 0.3, BELT1_Z);
      factory.add(leg);
    }

    // ============ BELT 2 ============
    const belt2Len = BELT2_MAX_X - BELT2_MIN_X;
    const belt2CenterX = (BELT2_MIN_X + BELT2_MAX_X) / 2;
    const belt2Geo = new THREE.BoxGeometry(belt2Len, 0.2, 1.2);
    const belt2Mat = new THREE.MeshBasicMaterial({
      color: 0x2a1a4a,
      transparent: true,
      opacity: 0.7,
    });
    const belt2 = new THREE.Mesh(belt2Geo, belt2Mat);
    belt2.position.set(belt2CenterX, 0.7, BELT2_Z);
    factory.add(belt2);
    const belt2EdgeGeo = new THREE.EdgesGeometry(belt2Geo);
    const belt2EdgeMat = new THREE.LineBasicMaterial({
      color: palette.idleEdge,
      transparent: true,
      opacity: 0.8,
    });
    const belt2Edges = new THREE.LineSegments(belt2EdgeGeo, belt2EdgeMat);
    belt2Edges.position.copy(belt2.position);
    factory.add(belt2Edges);
    disposables.push(belt2Geo, belt2EdgeGeo, belt2Mat, belt2EdgeMat);

    for (let lx = BELT2_MIN_X + 0.5; lx <= BELT2_MAX_X - 1; lx += 4) {
      const leg = makeCyl(0.1, 0.7, { fill: 0x3a2a5c, fillOpacity: 0.8 });
      leg.position.set(lx, 0.35, BELT2_Z);
      factory.add(leg);
    }

    // ============ BOXES ============
    const BOX_COUNT = 3;
    const boxes = [];
    for (let i = 0; i < BOX_COUNT; i++) {
      const p = makeBox(0.6, 0.6, 0.6, {
        fill: palette.hot,
        edge: palette.activeEdge,
        fillOpacity: 0.5,
      });
      const startX = BELT1_MIN_X + i * (belt1Len / BOX_COUNT);
      p.position.set(startX, 1.1, BELT1_Z);

      const labelGeo = new THREE.BoxGeometry(0.26, 0.015, 0.26);
      const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, 0.31, 0);
      const alreadyPressed = startX > -12;
      labelMesh.visible = alreadyPressed;
      p.add(labelMesh);
      disposables.push(labelGeo, labelMat);

      factory.add(p);
      boxes.push({ mesh: p, state: "on_belt1", belt2X: 0, label: labelMesh, shrunk: false });
    }

    // ============ ROBOT ARM ============
    const robotBase = makeCyl(0.7, 0.4, {
      fill: palette.active,
      edge: palette.activeEdge,
      fillOpacity: 0.3,
    });
    robotBase.position.set(ROBOT_X, 0.2, 0);
    factory.add(robotBase);
    machines.push(robotBase);

    const robotColumn = makeCyl(0.25, 1.5, {
      fill: palette.active,
      edge: palette.activeEdge,
    });
    robotColumn.position.set(ROBOT_X, 1.15, 0);
    factory.add(robotColumn);
    machines.push(robotColumn);

    const robotPivot = new THREE.Group();
    robotPivot.position.set(ROBOT_X, 1.9, 0);
    factory.add(robotPivot);

    const shoulder = new THREE.Group();
    robotPivot.add(shoulder);

    const armUpper = makeBox(2.2, 0.28, 0.28, {
      fill: palette.active,
      edge: palette.activeEdge,
    });
    armUpper.position.set(1.1, 0, 0);
    shoulder.add(armUpper);
    machines.push(armUpper);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(2.2, 0, 0);
    shoulder.add(elbowPivot);

    const armLower = makeBox(1.8, 0.24, 0.24, {
      fill: palette.active,
      edge: palette.activeEdge,
    });
    armLower.position.set(0.9, 0, 0);
    elbowPivot.add(armLower);
    machines.push(armLower);

    const gripperGroup = new THREE.Group();
    gripperGroup.position.set(1.8, 0, 0);
    gripperGroup.rotation.order = "ZYX";
    elbowPivot.add(gripperGroup);

    const gripperBase = makeBox(0.8, 0.15, 0.3, {
      fill: palette.active,
      edge: palette.activeEdge,
    });
    gripperGroup.add(gripperBase);
    machines.push(gripperBase);

    const fingerLeft = makeBox(0.08, 0.35, 0.15, {
      fill: palette.hot,
      edge: palette.activeEdge,
      fillOpacity: 0.4,
    });
    fingerLeft.position.set(-0.35, -0.25, 0);
    gripperGroup.add(fingerLeft);
    machines.push(fingerLeft);

    const fingerRight = makeBox(0.08, 0.35, 0.15, {
      fill: palette.hot,
      edge: palette.activeEdge,
      fillOpacity: 0.4,
    });
    fingerRight.position.set(0.35, -0.25, 0);
    gripperGroup.add(fingerRight);
    machines.push(fingerRight);

    const carriedSlot = new THREE.Object3D();
    carriedSlot.position.set(0, -0.4, 0);
    gripperGroup.add(carriedSlot);

    // ============ QC STATION ============
    const qcStation = makeBox(2.5, 1.8, 2.5);
    qcStation.position.set(-4, 0.9, 3);
    factory.add(qcStation);
    machines.push(qcStation);

    const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
    const beamMat = new THREE.MeshBasicMaterial({
      color: palette.hot,
      transparent: true,
      opacity: 0,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(-4, 2.4, 3);
    factory.add(beam);
    disposables.push(beamGeo, beamMat);

    // ============ PACKAGING ============
    const pack = makeBox(2.8, 2.2, 2.2);
    pack.position.set(BELT2_MAX_X + 1.5, 1.1, BELT2_Z);
    factory.add(pack);
    machines.push(pack);

    const press = makeBox(1.5, 0.4, 1.5, {
      fill: palette.active,
      edge: palette.activeEdge,
      fillOpacity: 0.3,
    });
    press.position.set(BELT2_MAX_X + 1.5, 2.0, BELT2_Z);
    press.userData.press = true;
    press.userData.baseY = 2.0;
    factory.add(press);
    machines.push(press);

    // ============ SHRINK TUNNEL ============
    const SHRINK_X = 10.7;
    const stOpts = { fill: 0x1a0f2e, edge: palette.idleEdge, fillOpacity: 0.92 };

    const stRoof = makeBox(2.8, 0.38, 2.1, stOpts);
    stRoof.position.set(SHRINK_X, 2.1, BELT2_Z);
    factory.add(stRoof); machines.push(stRoof);

    const stNear = makeBox(2.8, 1.35, 0.22, stOpts);
    stNear.position.set(SHRINK_X, 1.23, BELT2_Z - 0.94);
    factory.add(stNear); machines.push(stNear);

    const stFar = makeBox(2.8, 1.35, 0.22, stOpts);
    stFar.position.set(SHRINK_X, 1.23, BELT2_Z + 0.94);
    factory.add(stFar); machines.push(stFar);

    const stEntFrame = makeBox(0.3, 0.55, 2.1, stOpts);
    stEntFrame.position.set(SHRINK_X - 1.4, 1.93, BELT2_Z);
    factory.add(stEntFrame); machines.push(stEntFrame);

    const stExFrame = makeBox(0.3, 0.55, 2.1, stOpts);
    stExFrame.position.set(SHRINK_X + 1.4, 1.93, BELT2_Z);
    factory.add(stExFrame); machines.push(stExFrame);

    // Dark interior block hides boxes in transit
    const stIntGeo = new THREE.BoxGeometry(2.5, 1.2, 1.6);
    const stIntMat = new THREE.MeshBasicMaterial({ color: 0x010004 });
    const stInt = new THREE.Mesh(stIntGeo, stIntMat);
    stInt.position.set(SHRINK_X, 1.22, BELT2_Z);
    stInt.renderOrder = 0;
    factory.add(stInt);
    disposables.push(stIntGeo, stIntMat);

    // ============ SHRINK TUNNEL BEACON ============
    const beaconPoleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8);
    const beaconPoleMat = new THREE.MeshBasicMaterial({ color: 0x1a0f2e });
    const beaconPole = new THREE.Mesh(beaconPoleGeo, beaconPoleMat);
    beaconPole.position.set(SHRINK_X, 2.52, BELT2_Z - 0.6);
    factory.add(beaconPole);

    const beaconGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x550000,
      transparent: true,
      opacity: 0.9,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(SHRINK_X, 2.88, BELT2_Z - 0.6);
    factory.add(beacon);

    // outer glow ring
    const beaconRingGeo = new THREE.TorusGeometry(0.18, 0.03, 8, 24);
    const beaconRingMat = new THREE.MeshBasicMaterial({
      color: 0x550000,
      transparent: true,
      opacity: 0.0,
    });
    const beaconRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
    beaconRing.position.copy(beacon.position);
    beaconRing.rotation.x = Math.PI / 2;
    factory.add(beaconRing);

    disposables.push(beaconPoleGeo, beaconPoleMat, beaconGeo, beaconMat, beaconRingGeo, beaconRingMat);

    // ============ HMI PANEL ============
    const hmiX = -2.6;
    const hmiBaseZ = 3;
    const hmiY = 1.5;

    const hmiArm = makeBox(0.38, 0.06, 0.08, { fill: 0x1a0f2e, edge: palette.idleEdge, fillOpacity: 0.95 });
    hmiArm.position.set(hmiX - 0.19, hmiY, hmiBaseZ);
    factory.add(hmiArm); machines.push(hmiArm);

    const hmiBody = makeBox(0.06, 0.44, 0.56, { fill: 0x0d0820, edge: palette.idleEdge, fillOpacity: 0.98 });
    hmiBody.position.set(hmiX, hmiY, hmiBaseZ);
    factory.add(hmiBody); machines.push(hmiBody);

    const hmiScreenGeo = new THREE.BoxGeometry(0.01, 0.32, 0.42);
    const hmiScreenMat = new THREE.MeshBasicMaterial({ color: palette.active, transparent: true, opacity: 0.55 });
    const hmiScreen = new THREE.Mesh(hmiScreenGeo, hmiScreenMat);
    hmiScreen.position.set(hmiX + 0.04, hmiY, hmiBaseZ);
    factory.add(hmiScreen);
    disposables.push(hmiScreenGeo, hmiScreenMat);

    [-0.12, 0, 0.12].forEach((oz, idx) => {
      const dotGeo = new THREE.BoxGeometry(0.012, 0.055, 0.055);
      const dotMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x00ff88 : idx === 1 ? palette.hot : 0x4488ff,
        transparent: true, opacity: 0.9,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(hmiX + 0.04, hmiY - 0.22, hmiBaseZ + oz);
      factory.add(dot);
      disposables.push(dotGeo, dotMat);
    });

    // ============ AGV ============
    const agv = new THREE.Group();

    const agvChassis = makeBox(1.2, 0.15, 1.6, {
      fill: 0x0a0a0a,
      fillOpacity: 0.9,
      edge: palette.activeEdge,
    });
    agvChassis.position.y = 0.15;
    agv.add(agvChassis);
    machines.push(agvChassis);

    const agvBody = makeBox(1.0, 0.35, 1.4, {
      fill: palette.hot,
      edge: palette.activeEdge,
      fillOpacity: 0.5,
    });
    agvBody.position.y = 0.4;
    agv.add(agvBody);
    machines.push(agvBody);

    const wheelPositions = [
      [-0.55, 0.15, 0.5],  [0.55, 0.15, 0.5],
      [-0.55, 0.15, -0.5], [0.55, 0.15, -0.5],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = makeCyl(0.15, 0.1, {
        fill: 0x000000,
        edge: palette.activeEdge,
        fillOpacity: 0.9,
      });
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      agv.add(wheel);
    });

    const agvLoad = makeBox(0.6, 0.4, 0.6, {
      fill: palette.active,
      edge: palette.activeEdge,
      fillOpacity: 0.3,
    });
    agvLoad.position.y = 0.825;
    agv.add(agvLoad);
    machines.push(agvLoad);

    const agvLabelGeo = new THREE.BoxGeometry(0.26, 0.015, 0.26);
    const agvLabelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
    const agvLabel = new THREE.Mesh(agvLabelGeo, agvLabelMat);
    agvLabel.position.set(0, 0.21, 0);
    agvLoad.add(agvLabel);
    disposables.push(agvLabelGeo, agvLabelMat);

    const agvLightGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const agvLightMat = new THREE.MeshBasicMaterial({ color: palette.hot });

    const agvLight = new THREE.Mesh(agvLightGeo, agvLightMat);
    agvLight.position.set(0.35, 0.4, 0.72);
    agv.add(agvLight);

    const agvLight2 = new THREE.Mesh(agvLightGeo, agvLightMat);
    agvLight2.position.set(-0.35, 0.4, 0.72);
    agv.add(agvLight2);

    const agvScanner = makeBox(0.4, 0.1, 0.2, {
      fill: 0x000000,
      edge: palette.activeEdge,
    });
    agvScanner.position.set(0, 0.25, 0.75);
    agv.add(agvScanner);

    const antennaPole = makeCyl(0.02, 0.4, {
      fill: 0x000000,
      edge: palette.activeEdge,
      fillOpacity: 0.9,
    });
    antennaPole.position.set(-0.4, 0.75, -0.5);
    agv.add(antennaPole);

    const antennaTipGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const antennaTip = new THREE.Mesh(antennaTipGeo, agvLightMat);
    antennaTip.position.set(-0.4, 0.95, -0.5);
    agv.add(antennaTip);
    disposables.push(antennaTipGeo);

    agv.position.set(-14, 0, 0);
    factory.add(agv);
    disposables.push(agvLightGeo, agvLightMat);

    // ============ WORKERS ============
    function makeHuman(x, z, rotY = 0) {
      const h = new THREE.Group();
      const bodyColor = 0x3a2a5c;
      const edgeColor = palette.activeEdge;

      function part(geo, opacity = 0.82, edgeOp = 0.32) {
        const mat = new THREE.MeshBasicMaterial({ color: bodyColor, transparent: true, opacity });
        const eg = new THREE.EdgesGeometry(geo);
        const em = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOp });
        const g = new THREE.Group();
        g.add(new THREE.Mesh(geo, mat));
        g.add(new THREE.LineSegments(eg, em));
        disposables.push(geo, mat, eg, em);
        return g;
      }

      const footL = part(new THREE.BoxGeometry(0.15, 0.07, 0.26));
      footL.position.set(-0.15, 0.035, 0.07);
      h.add(footL);
      const footR = part(new THREE.BoxGeometry(0.15, 0.07, 0.26));
      footR.position.set(0.15, 0.035, 0.07);
      h.add(footR);

      const shinL = part(new THREE.CylinderGeometry(0.065, 0.07, 0.48, 8));
      shinL.position.set(-0.15, 0.31, 0);
      h.add(shinL);
      const shinR = part(new THREE.CylinderGeometry(0.065, 0.07, 0.48, 8));
      shinR.position.set(0.15, 0.31, 0);
      h.add(shinR);

      const thighL = part(new THREE.CylinderGeometry(0.09, 0.075, 0.46, 8));
      thighL.position.set(-0.14, 0.78, 0);
      h.add(thighL);
      const thighR = part(new THREE.CylinderGeometry(0.09, 0.075, 0.46, 8));
      thighR.position.set(0.14, 0.78, 0);
      h.add(thighR);

      const torso = part(new THREE.BoxGeometry(0.44, 0.70, 0.26), 0.85, 0.38);
      torso.position.y = 1.36;
      h.add(torso);

      const neck = part(new THREE.CylinderGeometry(0.08, 0.10, 0.18, 8));
      neck.position.y = 1.80;
      h.add(neck);

      const head = part(new THREE.SphereGeometry(0.20, 10, 7), 0.9, 0.30);
      head.position.y = 2.09;
      h.add(head);

      const uArmL = part(new THREE.CylinderGeometry(0.065, 0.060, 0.42, 8));
      uArmL.position.set(-0.27, 1.50, 0);
      uArmL.rotation.z = -0.22;
      h.add(uArmL);
      const uArmR = part(new THREE.CylinderGeometry(0.065, 0.060, 0.42, 8));
      uArmR.position.set(0.27, 1.50, 0);
      uArmR.rotation.z = 0.22;
      h.add(uArmR);

      const lArmL = part(new THREE.CylinderGeometry(0.055, 0.050, 0.38, 8));
      lArmL.position.set(-0.37, 1.12, 0);
      lArmL.rotation.z = -0.28;
      h.add(lArmL);
      const lArmR = part(new THREE.CylinderGeometry(0.055, 0.050, 0.38, 8));
      lArmR.position.set(0.37, 1.12, 0);
      lArmR.rotation.z = 0.28;
      h.add(lArmR);

      h.position.set(x, 0, z);
      h.rotation.y = rotY;
      return h;
    }

    factory.add(makeHuman(-8, -1.2, Math.PI));
    factory.add(makeHuman(-2, 3, -Math.PI / 2));

    // ============ CLOUD ============
    const cloud = new THREE.Group();
    cloud.position.set(0, 10, 0);
    scene.add(cloud);

    const cloudCoreGeo = new THREE.TorusKnotGeometry(1.2, 0.28, 80, 12, 2, 3);
    const cloudCoreMat = new THREE.MeshBasicMaterial({
      color: palette.active,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const cloudCore = new THREE.Mesh(cloudCoreGeo, cloudCoreMat);
    cloud.add(cloudCore);
    disposables.push(cloudCoreGeo, cloudCoreMat);

    const cloudSphereGeo = new THREE.IcosahedronGeometry(2, 1);
    const cloudSphereMat = new THREE.MeshBasicMaterial({
      color: palette.activeEdge,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const cloudSphere = new THREE.Mesh(cloudSphereGeo, cloudSphereMat);
    cloud.add(cloudSphere);
    disposables.push(cloudSphereGeo, cloudSphereMat);

    const orbitNodes = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.OctahedronGeometry(0.18, 0);
      const m = new THREE.MeshBasicMaterial({
        color: palette.hot,
        transparent: true,
        opacity: 0.8,
      });
      const n = new THREE.Mesh(g, m);
      n.userData = {
        angle: (i / 5) * Math.PI * 2,
        radius: 3 + Math.random() * 0.5,
        speed: 0.3 + Math.random() * 0.2,
        yOff: Math.random() * 0.5,
      };
      cloud.add(n);
      orbitNodes.push(n);
      disposables.push(g, m);
    }

    // ============ QC SCANNER ============
    let laserBeam = new THREE.Group();
    let laserMat;

    [-5].forEach((x) => {
      const gateShape = new THREE.Shape();
      gateShape.moveTo(0, 0);
      gateShape.lineTo(0.4, 0);
      gateShape.lineTo(0.4, 2.4);
      gateShape.lineTo(2.6, 2.4);
      gateShape.lineTo(2.6, 0);
      gateShape.lineTo(3.0, 0);
      gateShape.lineTo(3.0, 2.8);
      gateShape.lineTo(0, 2.8);
      gateShape.lineTo(0, 0);

      const extrudeSettings = { depth: 0.5, bevelEnabled: false };
      const gateGeo = new THREE.ExtrudeGeometry(gateShape, extrudeSettings);
      gateGeo.center();

      const gateMat = new THREE.MeshBasicMaterial({
        color: palette.idle,
        transparent: true,
        opacity: 0.35,
      });
      const gateMesh = new THREE.Mesh(gateGeo, gateMat);

      const gateEdgeGeo = new THREE.EdgesGeometry(gateGeo);
      const gateEdgeMat = new THREE.LineBasicMaterial({
        color: palette.idleEdge,
        transparent: true,
        opacity: 0.9,
      });
      const gateEdges = new THREE.LineSegments(gateEdgeGeo, gateEdgeMat);

      const scannerGroup = new THREE.Group();
      scannerGroup.add(gateMesh);
      scannerGroup.add(gateEdges);
      scannerGroup.userData = { fillMat: gateMat, edgeMat: gateEdgeMat };
      scannerGroup.rotation.y = Math.PI / 2;
      scannerGroup.position.set(x, 1.4, -3);
      factory.add(scannerGroup);
      machines.push(scannerGroup);

      const numBeams = 5;
      const beamSpacing = 0.35;
      const totalWidth = (numBeams - 1) * beamSpacing;
      const beamStartX = -totalWidth / 2;
      const beamHeight = 1.6;
      const laserGeo = new THREE.CylinderGeometry(0.008, 0.008, beamHeight, 8);
      laserMat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7,
      });

      for (let i = 0; i < numBeams; i++) {
        const b = new THREE.Mesh(laserGeo, laserMat);
        b.position.set(beamStartX + i * beamSpacing, 0.2, 0);
        laserBeam.add(b);
      }
      scannerGroup.add(laserBeam);

      const emitter = makeBox(totalWidth + 0.2, 0.05, 0.2, { fill: 0xff0000 });
      emitter.position.set(0, 1.0, 0);
      scannerGroup.add(emitter);

      disposables.push(gateGeo, gateEdgeGeo, gateMat, gateEdgeMat, laserGeo, laserMat);
    });

    // ============ PARTICLES ============
    const deployTargets = [
      new THREE.Vector3(-12, 2.2, -5),
      new THREE.Vector3(ROBOT_X, 1.9, 0),
      new THREE.Vector3(-4, 0.9, 3),
      new THREE.Vector3(BELT2_MAX_X + 1.5, 1.1, BELT2_Z),
      new THREE.Vector3(-5, 2.4, -3),
    ];

    const STREAM_COUNT = deployTargets.length;
    const PARTICLES_PER_STREAM = 40;
    const totalParticles = STREAM_COUNT * PARTICLES_PER_STREAM;
    const positions = new Float32Array(totalParticles * 3);
    const streamData = [];

    for (let s = 0; s < STREAM_COUNT; s++) {
      for (let p = 0; p < PARTICLES_PER_STREAM; p++) {
        streamData.push({
          stream: s,
          progress: p / PARTICLES_PER_STREAM,
          offset: (Math.random() - 0.5) * 0.3,
        });
      }
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const pTex = (() => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext("2d");
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(220,180,255,1)");
      grad.addColorStop(0.4, "rgba(180,130,255,0.7)");
      grad.addColorStop(1, "rgba(140,80,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const pMat = new THREE.PointsMaterial({
      size: 0.5,
      map: pTex,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: palette.particle,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    disposables.push(pGeo, pMat, pTex);

    const AMB_COUNT = 200;
    const ambPos = new Float32Array(AMB_COUNT * 3);
    for (let i = 0; i < AMB_COUNT; i++) {
      ambPos[i * 3]     = (Math.random() - 0.5) * 60;
      ambPos[i * 3 + 1] = Math.random() * 12;
      ambPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const ambGeo = new THREE.BufferGeometry();
    ambGeo.setAttribute("position", new THREE.BufferAttribute(ambPos, 3));
    const ambMat = new THREE.PointsMaterial({
      size: 0.08,
      map: pTex,
      color: palette.accent,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ambient = new THREE.Points(ambGeo, ambMat);
    scene.add(ambient);
    disposables.push(ambGeo, ambMat);

    // ============ STARFIELD ============
    const STAR_COUNT = 1800;
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starVX  = new Float32Array(STAR_COUNT);
    const starVY  = new Float32Array(STAR_COUNT);
    const starVZ  = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 72 + Math.random() * 28;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) + 5;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const speed = 0.8 + Math.random() * 1.6;
      const vTheta = Math.random() * Math.PI * 2;
      const vPhi   = Math.acos(2 * Math.random() - 1);
      starVX[i] = speed * Math.sin(vPhi) * Math.cos(vTheta);
      starVY[i] = speed * Math.cos(vPhi) * 0.5;
      starVZ[i] = speed * Math.sin(vPhi) * Math.sin(vTheta);
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.0,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      color: 0xe0d8ff,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    const lineMat = new THREE.LineBasicMaterial({
      color: palette.active,
      transparent: true,
      opacity: 0.15,
    });
    disposables.push(lineMat);
    deployTargets.forEach((t) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 10, 0),
        t,
      ]);
      scene.add(new THREE.Line(g, lineMat));
      disposables.push(g);
    });

    // ============ CAMERA ============
    const camRadius = 30;
    let camAngle = Math.PI * 0.5;
    const camHeight = 15;
    camera.position.set(
      Math.cos(camAngle) * camRadius,
      camHeight,
      Math.sin(camAngle) * camRadius
    );
    camera.lookAt(2, 1.5, 0);

    // ============ STATE ============
    const state = {
      phase: "optimize",
      activation: 1,
      oee: 70,
      throughput: 280,
      latency: 52,
      deployProgress: 1,
      running: 1,
    };

    const oeeHistory = Array(40).fill(60);

    function updateSparkline() {
      if (!hudRefs.sparkPath.current || !hudRefs.sparkArea.current) return;
      const pts = oeeHistory.map((v, i) => {
        const x = (i / (oeeHistory.length - 1)) * 180;
        const y = 28 - ((v - 50) / 50) * 26;
        return `${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      hudRefs.sparkPath.current.setAttribute("d", "M" + pts.join(" L"));
      hudRefs.sparkArea.current.setAttribute(
        "d",
        `M0 28 L${pts.join(" L")} L180 28 Z`
      );
    }

    function pushLog(msg) {
      if (!hudRefs.log.current) return;
      const ts = new Date().toTimeString().slice(0, 8);
      const div = document.createElement("div");
      div.className = "sfh-log-line sfh-log-new";
      div.innerHTML = `<span class="sfh-log-tag">${ts}</span>${msg}`;
      hudRefs.log.current.insertBefore(div, hudRefs.log.current.firstChild);
      while (hudRefs.log.current.children.length > 4) {
        hudRefs.log.current.removeChild(hudRefs.log.current.lastChild);
      }
    }

    pushLog("pipeline idle · awaiting trigger");

    // ============ GSAP TIMELINE (23s) ============
    const tl = gsap.timeline({ repeat: -1 });

    tl.call(() => {
      state.phase = "optimize";
      if (hudRefs.phase.current)
        hudRefs.phase.current.textContent = "MES_ACTIVE";
      if (hudRefs.phaseDetail.current)
        hudRefs.phaseDetail.current.textContent = "CONTINUOUS_FLOW (ZERO_BOTTLENECKS)";
    });

    tl.to(state, { oee: 85, duration: 3, ease: "power1.inOut" });
    tl.to(state, { throughput: 540, duration: 3, ease: "power1.inOut" }, "<");
    tl.to(state, { latency: 32, duration: 3, ease: "power1.inOut" }, "<");
    tl.call(() => pushLog("▲ cycle time reduced 18%"));

    tl.to(state, { oee: 94, duration: 3, ease: "power1.inOut" });
    tl.to(state, { throughput: 740, duration: 3, ease: "power1.inOut" }, "<");
    tl.to(state, { latency: 22, duration: 3, ease: "power1.inOut" }, "<");
    tl.call(() => pushLog("▲ bottleneck resolved · line 2"));

    tl.to(state, { oee: 98, duration: 2, ease: "power1.out" });
    tl.to(state, { throughput: 847, duration: 2, ease: "power1.out" }, "<");
    tl.to(state, { latency: 18, duration: 2, ease: "power1.out" }, "<");
    tl.call(() => pushLog("● system stable · 98% OEE"));
    tl.to({}, { duration: 4 });
    tl.call(() => pushLog("● throughput maximized"));

    tl.to({}, { duration: 1 });

    tl.call(() => {
      state.phase = "reset";
      if (hudRefs.phase.current)
        hudRefs.phase.current.textContent = "MANUAL_OVERRIDE";
      if (hudRefs.phaseDetail.current)
        hudRefs.phaseDetail.current.textContent = "DISABLED (BOTTLENECK_DETECTED)";
      pushLog("↻ shutting down production line");
    });
    tl.to(state, {
      activation: 0,
      running: 0,
      oee: 0,
      throughput: 0,
      latency: 200,
      deployProgress: 0,
      duration: 3,
      ease: "power2.inOut",
    });
    tl.to({}, { duration: 2 });
    tl.call(() => {
      state.phase = "optimize";
      if (hudRefs.phase.current) hudRefs.phase.current.textContent = "INITIALIZING_MES...";
      if (hudRefs.phaseDetail.current) hudRefs.phaseDetail.current.textContent = "RESOLVING_BOTTLENECK...";
      pushLog("→ restarting production line");
    });
    tl.to(state, {
      activation: 1,
      running: 1,
      oee: 70,
      throughput: 280,
      latency: 52,
      deployProgress: 1,
      duration: 4,
      ease: "power2.inOut",
    });
    tl.call(() => pushLog("✓ line running · 70% OEE"));
    tl.to({}, { duration: 1 });

    // ============ FRAME UPDATE ============
    let lastTime = performance.now();
    let beltOffset = 0;
    let agvTime = 0;
    let rafId = 0;

    const CNC_X = -12;
    const CNC_HEAD_BASE_Y = 2.2;
    const CNC_HEAD_DOWN_Y = 1.5;
    let cncState = "idle";
    let cncTimer = 0;
    let cncBox = null;

    const tmpFillColor = new THREE.Color();
    const tmpEdgeColor = new THREE.Color();
    const colIdle = new THREE.Color(palette.idle);
    const colActive = new THREE.Color(palette.active);
    const colIdleEdge = new THREE.Color(palette.idleEdge);
    const colActiveEdge = new THREE.Color(palette.activeEdge);

    function updateMaterials() {
      const act = state.activation;
      tmpFillColor.copy(colIdle).lerp(colActive, act);
      tmpEdgeColor.copy(colIdleEdge).lerp(colActiveEdge, act);
      const fillOp = 0.25 + act * 0.35;
      const edgeOp = 0.6 + act * 0.35;

      machines.forEach((m) => {
        if (m.userData && m.userData.fillMat) {
          m.userData.fillMat.color.copy(tmpFillColor);
          m.userData.fillMat.opacity = fillOp;
          if (m.userData.edgeMat) {
            m.userData.edgeMat.color.copy(tmpEdgeColor);
            m.userData.edgeMat.opacity = edgeOp;
          }
        }
      });

      belt1Mat.opacity = 1.0;
      belt2Mat.opacity = 1.0;
      beamMat.opacity = act * 0.9;

      if (laserMat) {
        laserMat.opacity = 0.1 + act * 0.7;
      }

      agvLight.material.color.setHSL(
        0.75,
        0.8,
        0.5 + Math.sin(agvTime * 4) * 0.2 * act
      );
    }

    function updateParticles(dt) {
      const posAttr = pGeo.attributes.position;
      const dp = state.deployProgress;
      const act = state.activation;

      for (let i = 0; i < totalParticles; i++) {
        const d = streamData[i];
        const target = deployTargets[d.stream];

        d.progress += dt * (0.3 + dp * 0.5) * (0.8 + d.stream * 0.1);
        if (d.progress > 1) d.progress -= 1;

        const visible =
          d.progress > (1 - dp) * 0.3 ||
          state.phase === "activate" ||
          state.phase === "optimize";

        if (!visible) {
          posAttr.array[i * 3] = 999;
          continue;
        }

        const t = d.progress;
        const cpX = target.x * 0.5;
        const cpY = 7;
        const cpZ = target.z * 0.5;
        const oneMinusT = 1 - t;

        posAttr.array[i * 3] =
          oneMinusT * oneMinusT * 0 +
          2 * oneMinusT * t * cpX +
          t * t * target.x +
          d.offset;
        posAttr.array[i * 3 + 1] =
          oneMinusT * oneMinusT * 10 +
          2 * oneMinusT * t * cpY +
          t * t * target.y;
        posAttr.array[i * 3 + 2] =
          oneMinusT * oneMinusT * 0 +
          2 * oneMinusT * t * cpZ +
          t * t * target.z +
          d.offset;
      }
      posAttr.needsUpdate = true;
      pMat.opacity = 0.4 + Math.max(dp, act) * 0.6;
    }

    function getBeltSpeed() {
      if (state.activation < 0.05) return 0;
      const oeeNorm = Math.max(0, (state.oee - 60) / 38);
      return state.activation * (0.6 + oeeNorm * 2.4);
    }

    // ============ ROBOT STATE MACHINE ============
    const pickOffset = -1.55;
    const placeOffset = -1.55;

    const pickDir = Math.atan2(PICK_POS.x - ROBOT_X, PICK_POS.z - 0) + pickOffset;
    const placeDir = Math.atan2(PLACE_POS.x - ROBOT_X, PLACE_POS.z - 0) + placeOffset;
    const neutralDir = (pickDir + placeDir) / 2;

    let robotState = "waiting";
    let robotTimer = 0;
    let currentBox = null;
    let currentRot = neutralDir;
    let rotTarget = neutralDir;
    let boxGrabOffset = new THREE.Vector3();
    robotPivot.rotation.y = currentRot;

    const tiltDown = 0;
    const tiltUp = 0.5;
    let shoulderTilt = tiltUp;
    const elbowBendRest = -0.8;
    const elbowBendPick = -0.15;
    let elbowBend = elbowBendRest;

    function updateRobot(dt) {
      if (state.running < 0.1) {
        shoulder.rotation.z = THREE.MathUtils.lerp(shoulder.rotation.z, tiltUp, 0.05);
        elbowPivot.rotation.z = THREE.MathUtils.lerp(elbowPivot.rotation.z, elbowBendRest, 0.05);
        return;
      }

      robotTimer += dt;

      const rotDelta = rotTarget - currentRot;
      const rotStep = dt * 3.0;
      if (Math.abs(rotDelta) > 0.01) {
        currentRot += Math.sign(rotDelta) * Math.min(Math.abs(rotDelta), rotStep);
        robotPivot.rotation.y = currentRot;
      } else {
        currentRot = rotTarget;
        robotPivot.rotation.y = currentRot;
      }

      switch (robotState) {
        case "waiting": {
          shoulderTilt = THREE.MathUtils.lerp(shoulderTilt, tiltUp, 0.1);
          elbowBend = THREE.MathUtils.lerp(elbowBend, elbowBendRest, 0.1);
          rotTarget = neutralDir;
          const candidate = boxes.find(
            (b) => b.state === "on_belt1" && b.mesh.position.x >= PICK_POS.x - 0.5
          );
          if (candidate) {
            currentBox = candidate;
            robotState = "turning_to_pick";
            rotTarget = pickDir;
          }
          break;
        }
        case "turning_to_pick": {
          shoulderTilt = THREE.MathUtils.lerp(shoulderTilt, tiltUp, 0.1);
          elbowBend = THREE.MathUtils.lerp(elbowBend, elbowBendRest, 0.1);
          if (Math.abs(currentRot - pickDir) < 0.05) {
            robotState = "picking_down";
            robotTimer = 0;
          }
          break;
        }
        case "picking_down": {
          shoulderTilt = THREE.MathUtils.lerp(shoulderTilt, tiltDown, 0.15);
          elbowBend = THREE.MathUtils.lerp(elbowBend, elbowBendPick, 0.15);
          if (robotTimer > 0.5) {
            if (currentBox) {
              currentBox.state = "picked";
              const worldPos = new THREE.Vector3();
              carriedSlot.getWorldPosition(worldPos);
              boxGrabOffset.copy(currentBox.mesh.position).sub(worldPos);
            }
            robotState = "picking_up";
            robotTimer = 0;
          }
          break;
        }
        case "picking_up": {
          shoulderTilt = THREE.MathUtils.lerp(shoulderTilt, tiltUp, 0.15);
          elbowBend = THREE.MathUtils.lerp(elbowBend, elbowBendRest, 0.15);
          if (robotTimer > 0.4) {
            robotState = "rotating";
            rotTarget = placeDir;
            robotTimer = 0;
          }
          break;
        }
        case "rotating": {
          shoulderTilt = THREE.MathUtils.lerp(shoulderTilt, tiltUp, 0.1);
          elbowBend = THREE.MathUtils.lerp(elbowBend, elbowBendRest, 0.1);
          if (Math.abs(currentRot - placeDir) < 0.05) {
            robotState = "placing_down";
            robotTimer = 0;
          }
          break;
        }
        case "placing_down": {
          shoulderTilt = THREE.MathUtils.lerp(shoulderTilt, tiltDown, 0.15);
          elbowBend = THREE.MathUtils.lerp(elbowBend, elbowBendPick, 0.15);
          if (robotTimer > 0.5) {
            if (currentBox) {
              currentBox.state = "on_belt2";
              currentBox.belt2X = 0;
              currentBox.mesh.position.copy(PLACE_POS);
              currentBox = null;
            }
            robotState = "placing_up";
            robotTimer = 0;
          }
          break;
        }
        case "placing_up": {
          shoulderTilt = THREE.MathUtils.lerp(shoulderTilt, tiltUp, 0.15);
          elbowBend = THREE.MathUtils.lerp(elbowBend, elbowBendRest, 0.15);
          if (robotTimer > 0.3) {
            robotState = "returning";
            rotTarget = neutralDir;
            robotTimer = 0;
          }
          break;
        }
        case "returning": {
          shoulderTilt = THREE.MathUtils.lerp(shoulderTilt, tiltUp, 0.1);
          elbowBend = THREE.MathUtils.lerp(elbowBend, elbowBendRest, 0.1);
          if (Math.abs(currentRot - neutralDir) < 0.05) {
            robotState = "waiting";
            robotTimer = 0;
          }
          break;
        }
      }

      shoulder.rotation.z = shoulderTilt;
      elbowPivot.rotation.z = elbowBend;
      gripperGroup.rotation.y = -currentRot + (Math.PI / 2);
      gripperGroup.rotation.z = -(shoulderTilt + elbowBend);

      if (currentBox && currentBox.state === "picked") {
        const worldPos = new THREE.Vector3();
        carriedSlot.getWorldPosition(worldPos);
        if (robotState === "placing_down") {
          const t = Math.min(robotTimer / 0.5, 1);
          currentBox.mesh.position.copy(worldPos).lerp(PLACE_POS, t * t);
        } else {
          boxGrabOffset.lerp(new THREE.Vector3(0, 0, 0), 0.1);
          currentBox.mesh.position.copy(worldPos).add(boxGrabOffset);
        }
      }
    }

    // ============ BOX MOVEMENT ============
    function updateBoxes(dt) {
      const speed = getBeltSpeed();
      beltOffset += dt * speed;

      boxes.forEach((b, i) => {
        if (b.state === "on_belt1") {
          const underCNC = b.mesh.position.x >= CNC_X - 0.6 && b.mesh.position.x < CNC_X + 0.6;
          if (underCNC && cncState !== "idle") {
            b.mesh.position.x = Math.min(b.mesh.position.x, CNC_X - 0.05);
          } else {
            b.mesh.position.x += dt * speed;
          }
          b.mesh.position.y = 1.1 + Math.sin(beltOffset * 2 + i * 2) * 0.015 * state.activation;

          if (b.mesh.position.x >= PICK_POS.x) {
            b.mesh.position.x = PICK_POS.x;
            b.mesh.position.z = PICK_POS.z;
          }
        } else if (b.state === "being_pressed") {
          if (b.mesh.position.x < CNC_X) {
            b.mesh.position.x += dt * speed;
            if (b.mesh.position.x > CNC_X) b.mesh.position.x = CNC_X;
          }
          b.mesh.position.y = 1.1;
          b.mesh.position.z = BELT1_Z;
        } else if (b.state === "on_belt2") {
          b.belt2X += dt * speed;
          b.mesh.position.x = PLACE_POS.x + b.belt2X;
          b.mesh.position.z = BELT2_Z;

          if (!b.shrunk && b.mesh.position.x > SHRINK_X + 1.2) {
            b.shrunk = true;
            b.mesh.scale.set(1, 0.667, 1);
          }
          b.mesh.position.y = b.shrunk ? 1.2 : 1.1;

          if (b.mesh.position.x > BELT2_MAX_X + 0.3) {
            const boxesOnB1 = boxes.filter((bx) => bx.state === "on_belt1");
            let startX = BELT1_MIN_X;
            if (boxesOnB1.length > 0) {
              const minX = Math.min(...boxesOnB1.map((bx) => bx.mesh.position.x));
              startX = Math.min(minX - belt1Len / BOX_COUNT, BELT1_MIN_X);
            }
            b.state = "on_belt1";
            b.mesh.position.set(startX, 1.1, BELT1_Z);
            b.mesh.scale.set(1, 1, 1);
            b.shrunk = false;
            b.label.visible = false;
          }
        }
      });
    }

    // ============ CNC LOGIC ============
    function updateCNC(dt) {
      const t = performance.now() * 0.001;

      machines.forEach((m) => {
        if (m.userData && m.userData.press) {
          m.position.y = m.userData.baseY - Math.abs(Math.sin(t * 1.5)) * 0.5 * state.running;
        }
      });

      const head = machines.find((m) => m.userData && m.userData.toolhead);
      if (!head) return;

      if (state.running < 0.1) {
        head.position.y = CNC_HEAD_BASE_Y;
        cncState = "idle";
        cncBox = null;
        return;
      }

      cncTimer += dt;

      switch (cncState) {
        case "idle": {
          head.position.y = THREE.MathUtils.lerp(head.position.y, CNC_HEAD_BASE_Y, 0.1);
          const candidate = boxes.find(
            (b) =>
              b.state === "on_belt1" &&
              b.mesh.position.x >= CNC_X - 0.55 &&
              b.mesh.position.x < CNC_X - 0.05
          );
          if (candidate) {
            candidate.state = "being_pressed";
            cncBox = candidate;
            cncState = "arriving";
            cncTimer = 0;
          }
          break;
        }
        case "arriving":
          head.position.y = THREE.MathUtils.lerp(head.position.y, CNC_HEAD_BASE_Y, 0.1);
          if (cncBox && cncBox.mesh.position.x >= CNC_X - 0.05) {
            cncBox.mesh.position.x = CNC_X;
            cncState = "pressing";
            cncTimer = 0;
          }
          break;
        case "pressing":
          head.position.y = THREE.MathUtils.lerp(head.position.y, CNC_HEAD_DOWN_Y, 0.16);
          if (cncTimer > 0.7) {
            if (cncBox) cncBox.label.visible = true;
            cncState = "releasing";
            cncTimer = 0;
          }
          break;
        case "releasing":
          head.position.y = THREE.MathUtils.lerp(head.position.y, CNC_HEAD_BASE_Y, 0.11);
          if (cncTimer > 0.65) {
            if (cncBox) { cncBox.state = "on_belt1"; cncBox = null; }
            cncState = "idle";
            cncTimer = 0;
          }
          break;
      }
    }

    // ============ AGV LOGIC ============
    const agvSegments = [
      { from: new THREE.Vector3(-14, 0.25, 0), to: new THREE.Vector3(-14, 0.25, 8) },
      { from: new THREE.Vector3(-14, 0.25, 8), to: new THREE.Vector3(16, 0.25, 8) },
      { from: new THREE.Vector3(16, 0.25, 8),  to: new THREE.Vector3(16, 0.25, 0) },
      { from: new THREE.Vector3(16, 0.25, 0),  to: new THREE.Vector3(-14, 0.25, 0) },
    ];

    function updateAGV(dt) {
      agvTime += dt * state.activation;

      const cycleLength = 15;
      const t = (agvTime % cycleLength) / cycleLength;

      let targetX = 0;
      let targetZ = 5.8;
      let targetRot = -Math.PI / 2;
      let hasBox = false;
      let isVisible = true;

      if (t < 0.25) {
        const progress = t / 0.25;
        targetX = THREE.MathUtils.lerp(35, 19.5, progress);
        targetRot = -Math.PI / 2;
        hasBox = false;
      } else if (t < 0.35) {
        targetX = 19.5;
        const progress = (t - 0.25) / 0.1;
        const ease = progress * progress * (3 - 2 * progress);
        targetRot = THREE.MathUtils.lerp(-Math.PI / 2, -Math.PI, ease);
        hasBox = false;
      } else if (t < 0.45) {
        targetX = 19.5;
        targetRot = -Math.PI;
        hasBox = t > 0.40;
      } else if (t < 0.55) {
        targetX = 19.5;
        const progress = (t - 0.45) / 0.1;
        const ease = progress * progress * (3 - 2 * progress);
        targetRot = THREE.MathUtils.lerp(-Math.PI, -Math.PI / 2, ease);
        hasBox = true;
      } else if (t < 0.85) {
        const progress = (t - 0.55) / 0.30;
        targetX = THREE.MathUtils.lerp(19.5, -35, progress);
        targetRot = -Math.PI / 2;
        hasBox = true;
      } else {
        isVisible = false;
        hasBox = false;
      }

      if (isVisible) {
        agv.position.set(targetX, 0, targetZ);
        agv.rotation.y = targetRot;
        agvLoad.visible = hasBox;
      } else {
        agv.position.set(0, -999, 0);
      }
    }

    // ============ BEACON ============
    function updateBeacon() {
      const t = performance.now() * 0.001;
      const boxInTunnel = boxes.some(
        (b) =>
          b.state === "on_belt2" &&
          b.mesh.position.x >= SHRINK_X - 1.45 &&
          b.mesh.position.x <= SHRINK_X + 1.45
      );

      if (boxInTunnel) {
        const pulse = 0.65 + 0.35 * Math.sin(t * 9);
        beaconMat.color.setHex(0x00ff66);
        beaconMat.opacity = pulse;
        beaconRingMat.color.setHex(0x00ff66);
        beaconRingMat.opacity = (1 - pulse) * 0.6;
        beaconRing.scale.setScalar(1 + (1 - pulse) * 0.5);
      } else {
        const idle = 0.25 + 0.15 * Math.sin(t * 1.2);
        beaconMat.color.setHex(0xff2200);
        beaconMat.opacity = idle;
        beaconRingMat.opacity = 0;
        beaconRing.scale.setScalar(1);
      }
    }

    // ============ CLOUD ANIMATION ============
    function updateCloud() {
      const t = performance.now() * 0.001;
      cloudCore.rotation.y = t * 0.3;
      cloudCore.rotation.x = t * 0.15;
      cloudSphere.rotation.y = -t * 0.1;
      cloud.position.y = 10 + Math.sin(t * 0.6) * 0.3;

      orbitNodes.forEach((n) => {
        n.userData.angle += 0.016 * n.userData.speed;
        n.position.x = Math.cos(n.userData.angle) * n.userData.radius;
        n.position.z = Math.sin(n.userData.angle) * n.userData.radius;
        n.position.y = Math.sin(n.userData.angle * 2 + n.userData.yOff) * 0.5;
        n.rotation.x = n.userData.angle;
        n.rotation.y = n.userData.angle * 0.7;
      });
    }

    function updateHUD() {
      if (hudRefs.oee.current)
        hudRefs.oee.current.textContent = state.oee.toFixed(0);
      if (hudRefs.thr.current)
        hudRefs.thr.current.textContent = Math.round(state.throughput);
      if (hudRefs.lat.current)
        hudRefs.lat.current.textContent = state.latency.toFixed(0);

      oeeHistory.push(state.oee);
      oeeHistory.shift();
      updateSparkline();
    }

    function animate() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (enableOrbit) {
        camAngle += dt * orbitSpeed;
        camera.position.x = Math.cos(camAngle) * camRadius;
        camera.position.z = Math.sin(camAngle) * camRadius;
        camera.position.y = camHeight + Math.sin(camAngle * 0.5) * 1.5;
        camera.lookAt(2, 1.5, 0);
      }

      updateMaterials();
      updateParticles(dt);
      updateCNC(dt);
      updateRobot(dt);
      updateBoxes(dt);
      updateAGV(dt);
      updateBeacon();
      updateCloud();
      updateHUD();

      const ap = ambGeo.attributes.position;
      for (let i = 0; i < AMB_COUNT; i++) {
        ap.array[i * 3 + 1] += dt * 0.1;
        if (ap.array[i * 3 + 1] > 12) ap.array[i * 3 + 1] = 0;
      }
      ap.needsUpdate = true;

      const st = performance.now() * 0.001;
      const sa = starGeo.attributes.position;
      for (let i = 0; i < STAR_COUNT; i++) {
        sa.array[i * 3]     += starVX[i] * dt;
        sa.array[i * 3 + 1] += starVY[i] * dt;
        sa.array[i * 3 + 2] += starVZ[i] * dt;
        const x = sa.array[i * 3], y = sa.array[i * 3 + 1], z = sa.array[i * 3 + 2];
        if (x*x + y*y + z*z > 110*110) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 72 + Math.random() * 28;
          sa.array[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
          sa.array[i * 3 + 1] = r * Math.cos(phi) + 5;
          sa.array[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
      }
      sa.needsUpdate = true;
      starMat.opacity = 0.75 + 0.10 * Math.sin(st * 0.28);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    animate();

    const ro = new ResizeObserver(() => {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });
    ro.observe(wrap);

    const onVisibility = () => {
      if (document.hidden) {
        tl.pause();
        cancelAnimationFrame(rafId);
      } else {
        tl.resume();
        lastTime = performance.now();
        animate();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      tl.kill();

      disposables.forEach((d) => {
        if (d && typeof d.dispose === "function") d.dispose();
      });

      scene.traverse((obj) => {
        if (obj.geometry && typeof obj.geometry.dispose === "function") {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose && m.dispose());
          } else if (typeof obj.material.dispose === "function") {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [mounted, enableOrbit, orbitSpeed, pixelRatioCap]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className={`sfh-root ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        background: palette.background,
        borderRadius: 12,
        overflow: "hidden",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        ...style,
      }}
    >
      <style>{`
        .sfh-root .sfh-grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(140,80,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(140,80,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
        }
        .sfh-root .sfh-overlay {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(5,0,20,0.7) 100%);
        }
        .sfh-root .sfh-hud {
          position: absolute; inset: 0; pointer-events: none;
          color: ${palette.hudPrimary};
        }
        .sfh-root .sfh-card {
          position: absolute;
          background: rgba(20,10,40,0.55);
          border: 1px solid rgba(180,130,255,0.35);
          border-radius: 8px;
          padding: 10px 14px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 0 20px rgba(140,80,255,0.15);
        }
        .sfh-root .sfh-label {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: ${palette.hudAccent};
          opacity: 0.85;
          margin-bottom: 4px;
        }
        .sfh-root .sfh-value {
          font-size: 22px;
          font-weight: 300;
          color: #fff;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.5px;
        }
        .sfh-root .sfh-unit {
          font-size: 12px;
          color: ${palette.hudAccent};
          margin-left: 2px;
        }
        .sfh-root .sfh-phase {
          top: 16px; right: 20px; min-width: 0; text-align: right;
          padding: 7px 10px;
          background: rgba(20,10,40,0.35);
          border-color: rgba(180,130,255,0.18);
          box-shadow: none;
        }
        .sfh-root .sfh-mono {
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 10px; font-weight: 500; letter-spacing: 0.3px; line-height: 1.4;
          color: rgba(255,255,255,0.7);
        }
        .sfh-root .sfh-mono-dim {
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 10px; font-weight: 400; letter-spacing: 0.3px; line-height: 1.4;
          color: ${palette.hudMuted};
        }
        .sfh-root .sfh-phase-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: #C895FF; box-shadow: 0 0 10px #C895FF;
          margin-right: 6px; vertical-align: middle;
          animation: sfh-pulse 1.4s ease-in-out infinite;
        }
        @keyframes sfh-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        .sfh-root .sfh-metrics {
          top: 16px; left: 20px;
          display: flex; align-items: stretch; gap: 0;
          padding: 8px 14px;
          background: rgba(20,10,40,0.35);
          border-color: rgba(180,130,255,0.18);
          box-shadow: none;
        }
        .sfh-root .sfh-m-item { padding: 0 14px; }
        .sfh-root .sfh-m-item:first-child { padding-left: 2px; }
        .sfh-root .sfh-m-item:last-child  { padding-right: 2px; }
        .sfh-root .sfh-m-label {
          font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
          color: ${palette.hudMuted}; opacity: 0.75; margin-bottom: 3px;
        }
        .sfh-root .sfh-m-val {
          font-size: 17px; font-weight: 300;
          color: rgba(255,255,255,0.75);
          font-variant-numeric: tabular-nums;
        }
        .sfh-root .sfh-m-unit {
          font-size: 10px; color: ${palette.hudMuted}; margin-left: 2px;
        }
        .sfh-root .sfh-m-sep {
          width: 1px; background: rgba(180,130,255,0.18); margin: 2px 0;
        }
        .sfh-root .sfh-spark {
          width: 72px; height: 16px; margin-top: 5px; display: block; opacity: 0.7;
        }

        @media (max-width: 720px) {
          .sfh-root .sfh-m-item.sfh-m-hide { display: none; }
          .sfh-root .sfh-m-sep.sfh-m-hide  { display: none; }
        }
      `}</style>

      <div className="sfh-grid-bg" />
      <div ref={canvasWrapRef} style={{ position: "absolute", inset: 0 }} />
      <div className="sfh-overlay" />

      {showHUD && (
        <div className="sfh-hud">
          <div className="sfh-card sfh-phase">
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: palette.hudMuted, opacity: 0.7, marginBottom: 2 }}>
              <span className="sfh-phase-dot" style={{ width: 5, height: 5, boxShadow: "0 0 6px #C895FF" }} />
              Status
            </div>
            <div className="sfh-mono" ref={hudRefs.phase}>MES_ACTIVE</div>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: palette.hudMuted, opacity: 0.7, marginTop: 6, marginBottom: 2 }}>
              Optimization
            </div>
            <div className="sfh-mono-dim" ref={hudRefs.phaseDetail}>CONTINUOUS_FLOW (ZERO_BOTTLENECKS)</div>
          </div>

          <div className="sfh-card sfh-metrics">
            <div className="sfh-m-item">
              <div className="sfh-m-label">OEE</div>
              <div className="sfh-m-val">
                <span ref={hudRefs.oee}>60</span>
                <span className="sfh-m-unit">%</span>
              </div>
              <svg className="sfh-spark" viewBox="0 0 180 28" preserveAspectRatio="none">
                <path ref={hudRefs.sparkPath} d="M0 20 L180 20" fill="none" stroke={palette.hudAccent} strokeWidth="1.5" strokeLinejoin="round" />
                <path ref={hudRefs.sparkArea} d="M0 28 L0 20 L180 20 L180 28 Z" fill="rgba(178,137,255,0.15)" />
              </svg>
            </div>
            <div className="sfh-m-sep sfh-m-hide" />
            <div className="sfh-m-item sfh-m-hide">
              <div className="sfh-m-label">Throughput</div>
              <div className="sfh-m-val">
                <span ref={hudRefs.thr}>0</span>
                <span className="sfh-m-unit">u/h</span>
              </div>
            </div>
            <div className="sfh-m-sep sfh-m-hide" />
            <div className="sfh-m-item sfh-m-hide">
              <div className="sfh-m-label">Latency</div>
              <div className="sfh-m-val">
                <span ref={hudRefs.lat}>—</span>
                <span className="sfh-m-unit">ms</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}