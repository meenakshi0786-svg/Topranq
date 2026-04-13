"use client";

import "./cube-loader.css";

export function CubeLoader({ label, sublabel }: { label?: string; sublabel?: string }) {
  return (
    <div className="cube-loader-container">
      <div className="wrapper-grid">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div className="cube" key={i}>
            <div className="face face-front" />
            <div className="face face-back" />
            <div className="face face-left" />
            <div className="face face-right" />
            <div className="face face-top" />
            <div className="face face-bottom" />
          </div>
        ))}
      </div>
      {label && <p className="cube-loader-label">{label}</p>}
      {sublabel && <p className="cube-loader-sublabel">{sublabel}</p>}
    </div>
  );
}
