import type { LegHardware } from "../lib/model";
export function Bolt({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.014, 6]} />
        <meshStandardMaterial
          color="#64757a"
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, -0.006, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.04, 8]} />
        <meshStandardMaterial color="#bcc6c8" metalness={0.8} />
      </mesh>
    </group>
  );
}
export function Connector({
  type,
  position,
  rotation = [0, 0, 0],
  bolts,
}: {
  type: LegHardware;
  position: [number, number, number];
  rotation?: [number, number, number];
  bolts: number;
}) {
  if (type === "none") return null;
  return (
    <group position={position} rotation={rotation}>
      {type === "lFoot" ? (
        <>
          <mesh position={[0, 0.008, 0]}>
            <boxGeometry args={[0.15, 0.016, 0.1]} />
            <meshStandardMaterial color="#a2b7b2" metalness={0.65} />
          </mesh>
          <mesh position={[-0.064, 0.052, 0]}>
            <boxGeometry args={[0.016, 0.1, 0.1]} />
            <meshStandardMaterial color="#a2b7b2" metalness={0.65} />
          </mesh>
        </>
      ) : (
        <>
          <mesh>
            <boxGeometry args={[0.17, 0.016, 0.12]} />
            <meshStandardMaterial color="#879ead" metalness={0.75} />
          </mesh>
          <mesh position={[0, -0.025, 0]}>
            <boxGeometry args={[0.05, 0.05, 0.09]} />
            <meshStandardMaterial color="#879ead" metalness={0.7} />
          </mesh>
        </>
      )}
      {Array.from({ length: bolts }, (_, i) => (
        <Bolt key={i} position={[(i - (bolts - 1) / 2) * 0.06, 0.012, 0]} />
      ))}
    </group>
  );
}
export function Clamp({
  position,
  end = false,
}: {
  position: [number, number, number];
  end?: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[end ? 0.04 : 0.07, 0.025, 0.08]} />
        <meshStandardMaterial color="#b4c4c5" metalness={0.8} />
      </mesh>
      <Bolt position={[0, 0.012, 0]} />
    </group>
  );
}
