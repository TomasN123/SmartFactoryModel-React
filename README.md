# SmartFactoryHero

A 3D animated smart factory visualization built with React, Three.js, and GSAP. Designed as a portfolio hero component - shows conveyor belts, a robot arm, CNC press, QC scanner, AGV, and a live MES dashboard with OEE metrics.

![Smart Factory demo](model.gif)


---

##  Tech Stack

- **React 18**
- **Three.js** — 3D scene, geometry, materials
- **GSAP** — animation timeline (metrics, machine states)
- **Vite** — dev server & build

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Build

```bash
npm run build
```

Output lands in `dist/`.  
Preview the production build locally:

```bash
npm run preview
```

---

## Usage as a component

Copy `src/SmartFactoryHero.jsx` into your project (requires `three` and `gsap`):

```bash
npm install three gsap
```

```jsx
import SmartFactoryHero from './SmartFactoryHero';

export default function App() {
  return <SmartFactoryHero height={600} />;
}
```

---

## 📁 Project Structure

```
  SmartFactoryModel-React/                                                      
  ├── public/                   # Static files
  ├── src/                                                                      
  │   ├── assets/               # Images, icons             
  │   ├── SmartFactoryHero.jsx  # Main 3D component
  │   ├── App.jsx               # Root component
  │   ├── App.css                                                               
  │   ├── main.jsx              # Entry point
  │   └── index.css                                                             
  ├── index.html                                            
  ├── package.json
  └── vite.config.js
```

---


