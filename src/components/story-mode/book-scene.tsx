"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  SRGBColorSpace,
  Matrix4,
  Vector3,
  type Texture,
} from "three";
import type { BookContentProps } from "./book-content";
import { pageTurnPoint } from "./page-turn";
import type { BookNavigation } from "./navigation";
export type BookSceneProps = BookContentProps & {
  navigation: BookNavigation;
  onComplete: () => void;
  mobileSide: "image" | "text";
  turnElement: HTMLElement | null;
  reducedMotion: boolean;
  onUnavailable: () => void;
  projection: HTMLElement | null;
  cameraElement: HTMLElement | null;
  coverElement: HTMLElement | null;
  imageElement: HTMLElement | null;
  textElement: HTMLElement | null;
};
// Match CSS perspective to the Three camera while keeping HTML in the app's
// React root. Separate ReactDOM roots (Drei Html) conflict with React 19.3's
// strict effect cleanup, so page text and dialogs use this shared DOM layer.
function cssMatrix(matrix: Matrix4, object = false) {
  const scale = 3.55 / 400;
  const values = matrix.elements.map((value, i) => {
    const sign = object ? (i >= 4 && i <= 7 ? -1 : 1) : i % 4 === 1 ? -1 : 1;
    const factor = object && i % 4 !== 3 && i < 12 ? scale : 1;
    return Math.abs(value) < 1e-10 ? 0 : value * sign * factor;
  });
  return `${object ? "translate(-50%,-50%)" : ""}matrix3d(${values.join(",")})`;
}
function useWoodTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#30241f";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = `rgba(${i % 2 ? "89,67,53" : "12,8,6"},${0.025 + (i % 7) / 260})`;
      ctx.lineWidth = 0.5 + (i % 3);
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = i * 2 + Math.sin(x / 90 + i * 0.6) * 4;
        if (!x) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
function Box({
  position,
  size,
  color,
  texture,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  texture?: Texture;
}) {
  return (
    <RoundedBox
      position={position}
      args={size}
      radius={0.025}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.94}
        bumpMap={texture}
        bumpScale={0.018}
      />
    </RoundedBox>
  );
}
function useClothTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#888";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 2) {
      ctx.fillStyle = i % 4 ? "#999" : "#777";
      ctx.fillRect(i, 0, 1, 128);
      ctx.fillRect(0, i, 128, 1);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
function Scene(props: BookSceneProps) {
  const { navigation, reducedMotion, onUnavailable } = props;
  const { invalidate, size, camera, gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, onUnavailable]);
  const cover = useRef<Group>(null);
  const leaf = useRef<Mesh>(null);
  const book = useRef<Group>(null);
  const leftHalf = useRef<Group>(null);
  const imageAnchor = useRef<Group>(null);
  const textAnchor = useRef<Group>(null);
  const coverAnchor = useRef<Group>(null);
  const elapsed = useRef(0);
  const wood = useWoodTexture();
  const cloth = useClothTexture();
  const completed = useRef(false);
  const stripMatrix = useMemo(() => new Matrix4(), []);
  const rotationMatrix = useMemo(() => new Matrix4(), []);
  const cameraInBook = useMemo(() => new Vector3(), []);
  const scaleVector = useMemo(() => new Vector3(), []);
  const geometry = useMemo(() => {
    const result = new PlaneGeometry(2.76, 3.74, 32, 8);
    result.translate(1.38, 0, 0);
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    elapsed.current = 0;
    completed.current = false;
    invalidate();
  }, [navigation.phase, navigation.page, invalidate]);
  useEffect(() => {
    invalidate();
  }, [props.mobileSide, props.turnElement, invalidate]);
  useFrame((_, delta) => {
    // A demand-rendered scene can be idle for minutes before its first frame.
    elapsed.current += Math.min(delta, 0.05);
    const duration = reducedMotion
      ? 0.08
      : navigation.phase === "turning"
        ? 0.7
        : 0.9;
    const progress = Math.min(elapsed.current / duration, 1);
    const ease = progress * progress * (3 - 2 * progress);
    const opening =
      navigation.phase === "opening"
        ? ease
        : navigation.phase === "closing"
          ? 1 - ease
          : navigation.phase === "cover"
            ? 0
            : 1;
    if (cover.current) {
      cover.current.rotation.y = -Math.PI * opening;
      cover.current.position.z = 0.13 - opening * 0.14;
    }
    if (leftHalf.current) leftHalf.current.scale.x = Math.max(0.001, opening);
    if (book.current) book.current.position.x = -1.45 * (1 - opening);
    const mobile = size.width <= 640;
    const aspect = size.width / size.height;
    const targetZ = mobile
      ? Math.max(6.1, 4.35 / aspect)
      : Math.max(6.4, 10.1 / aspect);
    const centerX = mobile
      ? (props.mobileSide === "text" ? 1.44 : -1.44) * opening
      : 0;
    camera.position.set(centerX, 0.38, targetZ + (1 - opening) * 0.45);
    camera.lookAt(centerX, 0, 0);
    camera.updateMatrixWorld();
    book.current?.updateWorldMatrix(true, true);
    if (props.projection && props.cameraElement) {
      const fov = (camera.projectionMatrix.elements[5] * size.height) / 2;
      props.projection.style.setProperty("perspective", `${fov}px`);
      props.cameraElement.style.setProperty(
        "transform",
        `translateZ(${fov}px)${cssMatrix(camera.matrixWorldInverse)}translate(${size.width / 2}px,${size.height / 2}px)`,
      );
      props.coverElement?.style.setProperty(
        "visibility",
        opening < 0.5 ? "visible" : "hidden",
      );
      for (const element of [props.imageElement, props.textElement]) {
        element?.style.setProperty(
          "opacity",
          String(Math.max(0, Math.min(1, (opening - 0.55) / 0.45))),
        );
      }
      for (const [element, anchor] of [
        [props.coverElement, coverAnchor.current],
        [props.imageElement, imageAnchor.current],
        [props.textElement, textAnchor.current],
      ] as const) {
        if (element && anchor)
          element.style.setProperty(
            "transform",
            cssMatrix(anchor.matrixWorld, true),
          );
      }
    }
    if (navigation.phase === "turning" && book.current) {
      cameraInBook.copy(camera.position);
      book.current.worldToLocal(cameraInBook);
      props.turnElement
        ?.querySelectorAll<HTMLElement>(".story-turn-strip")
        .forEach((element) => {
          const index = Number(element.dataset.segment);
          const x = 0.10875 + (index + 0.5) * (2.6625 / 16);
          const point = pageTurnPoint(x, progress, navigation.direction);
          const back = element.dataset.face === "back";
          stripMatrix.makeTranslation(point.x, 0, point.z + 0.1);
          rotationMatrix.makeRotationY(point.tangent + (back ? Math.PI : 0));
          stripMatrix
            .multiply(rotationMatrix)
            .scale(scaleVector.set(point.stretch, 1, 1))
            .premultiply(book.current!.matrixWorld);
          element.style.setProperty("transform", cssMatrix(stripMatrix, true));
          // CSS camera coordinates invert Y; choose the visible face explicitly.
          const frontFacing =
            (cameraInBook.x - point.x) * Math.sin(point.tangent) +
              (cameraInBook.z - point.z) * Math.cos(point.tangent) >
            0;
          element.style.setProperty(
            "visibility",
            frontFacing !== back ? "visible" : "hidden",
          );
          element.style.setProperty(
            "--turn-shade",
            String(Math.abs(Math.sin(point.tangent)) * 0.16),
          );
        });
    }
    if (leaf.current && navigation.phase === "turning") {
      const animatedGeometry = leaf.current.geometry;
      const positions = animatedGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const segment = i % 33;
        const x = (segment / 32) * 2.76;
        const point = pageTurnPoint(x, progress, navigation.direction);
        positions.setX(i, point.x);
        positions.setZ(i, point.z);
      }
      positions.needsUpdate = true;
      animatedGeometry.computeVertexNormals();
    }
    if (["opening", "closing", "turning"].includes(navigation.phase)) {
      if (progress < 1) invalidate();
      else if (!completed.current) {
        completed.current = true;
        props.onComplete();
      }
    }
  });
  return (
    <>
      <color attach="background" args={["#241912"]} />
      <ambientLight intensity={1.1} color="#ffe4c5" />
      <directionalLight
        position={[-3.5, 5, 7]}
        intensity={2.3}
        color="#ffe6c7"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-intensity={0.45}
        shadow-radius={4}
        shadow-normalBias={0.015}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.001}
      />
      <pointLight position={[4, -2, 5]} intensity={4} color="#d8ad76" />
      <group rotation={[-0.18, 0, -0.012]}>
        <mesh position={[0, 0, -0.32]} receiveShadow>
          <planeGeometry args={[35, 25]} />
          <meshStandardMaterial map={wood} roughness={0.95} />
        </mesh>
        <group ref={book}>
          <group ref={leftHalf}>
            <Box
              position={[-1.48, 0, -0.15]}
              size={[2.97, 4.05, 0.16]}
              color="#8f4635"
              texture={cloth}
            />
            <Box
              position={[-1.43, 0, -0.035]}
              size={[2.78, 3.81, 0.12]}
              color="#decdb2"
            />
            <Box
              position={[-1.43, 0, 0.05]}
              size={[2.77, 3.8, 0.02]}
              color="#fff4df"
            />
            {Array.from({ length: 7 }, (_, i) => (
              <Box
                key={i}
                position={[-1.43, -1.895 + (i % 3) * 0.002, -0.09 + i * 0.02]}
                size={[2.75 - (i % 2) * 0.008, 0.004, 0.006]}
                color="#c6b498"
              />
            ))}
          </group>
          <Box
            position={[1.48, 0, -0.15]}
            size={[2.97, 4.05, 0.16]}
            color="#8f4635"
            texture={cloth}
          />
          <Box
            position={[1.43, 0, -0.035]}
            size={[2.78, 3.81, 0.12]}
            color="#decdb2"
          />
          {Array.from({ length: 7 }, (_, i) => (
            <Box
              key={i}
              position={[1.43, -1.895 + (i % 3) * 0.002, -0.09 + i * 0.02]}
              size={[2.75 - (i % 2) * 0.008, 0.004, 0.006]}
              color="#c6b498"
            />
          ))}
          <Box
            position={[0, 0, 0.025]}
            size={[0.11, 3.83, 0.1]}
            color="#baa185"
          />
          <Box
            position={[1.43, 0, 0.05]}
            size={[2.77, 3.8, 0.02]}
            color="#fff4df"
          />
          <group ref={imageAnchor} position={[-1.44, 0, 0.075]} />
          <group ref={textAnchor} position={[1.44, 0, 0.075]} />
          {navigation.phase === "turning" ? (
            <mesh
              ref={leaf}
              geometry={geometry}
              position={[0, 0, 0.09]}
              castShadow
            >
              <meshStandardMaterial
                color="#fff4df"
                side={DoubleSide}
                roughness={0.9}
              />
            </mesh>
          ) : null}
          <group ref={cover} position={[0, 0, 0.1]}>
            <Box
              position={[1.47, 0, 0.06]}
              size={[2.95, 4.06, 0.12]}
              color="#984a36"
              texture={cloth}
            />
            <Box
              position={[0.09, 0, 0.126]}
              size={[0.04, 3.75, 0.009]}
              color="#c59962"
            />
            <group ref={coverAnchor} position={[1.48, 0, 0.13]} />
          </group>
        </group>
      </group>
    </>
  );
}
export default function BookScene(props: BookSceneProps) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      frameloop="demand"
      camera={{ position: [0, 0.55, 9], fov: 40 }}
      fallback={<p>The 3D view is unavailable.</p>}
    >
      <Scene {...props} />
    </Canvas>
  );
}
