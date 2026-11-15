import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./App.css";
import { pickMissionEvent } from "./events/missionEvents";
import {
  CREW_ROLES, MISSION_OBJECTIVES, RESEARCH_UPGRADES, OPERATION_LIMITS,
  applyEventEffects, calculateDailyConsumption, calculateMissionScore,
  chooseExtendedEvent, getRole
} from "./game/gameplay";

const STARTING_RESOURCES = { water: 100, oxygen: 100, food: 100, power: 100 };
const SAVE_VERSION = 1;
const resourceInfo = [
  { key: "water", label: "WATER", icon: "💧" },
  { key: "oxygen", label: "OXYGEN", icon: "🫧" },
  { key: "food", label: "FOOD", icon: "🥬" },
  { key: "power", label: "POWER", icon: "⚡" },
];


function PlanetSphere({ destination }) {
  const mountRef = useRef(null);
  const dragRef = useRef({ dragging: false, lastX: 0, velocity: 0 });

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.z = 5.65;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, destination === "moon" ? 0.62 : 0.48);
    scene.add(ambient);
    const sunlight = new THREE.DirectionalLight(0xffffff, 3.0);
    sunlight.position.set(-4.5, 2.8, 5);
    scene.add(sunlight);
    const rim = new THREE.PointLight(destination === "moon" ? 0xa8c9ff : 0xff8a4c, 1.15, 9);
    rim.position.set(3.2, -1.4, -2.5);
    scene.add(rim);

    const geometry = new THREE.SphereGeometry(1.34, 96, 96);
    const loader = new THREE.TextureLoader();
    const textureUrl = destination === "moon"
      ? "/assets/moon-texture.jpg"
      : "/assets/mars-texture.jpg";
    let material;
    let mesh;
    let disposed = false;
    loader.load(textureUrl, (texture) => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 1,
        metalness: 0,
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.z = destination === "moon" ? -0.12 : 0.08;
      scene.add(mesh);
    });

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (mesh) {
        const drag = dragRef.current;
        if (!drag.dragging) {
          mesh.rotation.y += 0.0018 + drag.velocity;
          drag.velocity *= 0.96;
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    const onPointerDown = (event) => {
      dragRef.current.dragging = true;
      dragRef.current.lastX = event.clientX;
      host.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag.dragging || !mesh) return;
      const delta = event.clientX - drag.lastX;
      drag.lastX = event.clientX;
      mesh.rotation.y += delta * 0.008;
      drag.velocity = delta * 0.00035;
    };
    const onPointerUp = () => { dragRef.current.dragging = false; };
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
      if (material) {
        material.map?.dispose();
        material.dispose();
      }
      geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [destination]);

  return <div className={`planet-canvas ${destination}`} ref={mountRef} role="img"
    aria-label={`Slowly rotating 3D ${destination === "moon" ? "Moon" : "Mars"} globe. Drag to rotate.`} />;
}

function App() {
  const [destination, setDestination] = useState("moon");
  const [planetPointer, setPlanetPointer] = useState({ x: 0, y: 0 });
  const [started, setStarted] = useState(false);
  const [day, setDay] = useState(1);
  const [resources, setResources] = useState({ ...STARTING_RESOURCES });
  const [message, setMessage] = useState("Mission ready. Protect your crew.");
  const [missionStatus, setMissionStatus] = useState("ACTIVE");
  const [pendingEvent, setPendingEvent] = useState(null);
  const [lastEventId, setLastEventId] = useState(null);

  const [crewRole, setCrewRole] = useState("engineer");
  const [abilityUsed, setAbilityUsed] = useState(false);
  const [crewHealth, setCrewHealth] = useState(100);
  const [morale, setMorale] = useState(85);
  const [research, setResearch] = useState(0);
  const [objectiveId, setObjectiveId] = useState("ice");
  const [objectiveProgress, setObjectiveProgress] = useState(0);
  const [upgrades, setUpgrades] = useState([]);
  const [extendedEvent, setExtendedEvent] = useState(null);
  const [lastExtendedEventId, setLastExtendedEventId] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);
  const [operationUses, setOperationUses] = useState({
  recycle: 0,
  grow: 0,
  solar: 0,
});
  const [saveNotice, setSaveNotice] = useState("");
  const loadInputRef = useRef(null);

  const role = getRole(crewRole);
  const objective = MISSION_OBJECTIVES[destination].find((item) => item.id === objectiveId);
  const consumption = calculateDailyConsumption(crewRole, upgrades);
  const score = calculateMissionScore({
    health: crewHealth, resources, research, objectiveProgress,
    missionDays: day, completed: missionStatus === "SUCCESS"
  });

  function saveMission() {
    const saveData = {
      app: "OUTPOST", saveVersion: SAVE_VERSION, savedAt: new Date().toISOString(),
      destination, started, day, resources, message, missionStatus,
      pendingEvent, lastEventId, crewRole, abilityUsed, crewHealth, morale,
      research, objectiveId, objectiveProgress, upgrades, extendedEvent,
      lastExtendedEventId, eventHistory, operationUses
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `outpost-${destination}-day-${day}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaveNotice("MISSION SAVE DOWNLOADED");
  }

  function loadMissionFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const validResources = data.resources &&
          ["water", "oxygen", "food", "power"].every(
            (key) => Number.isFinite(data.resources[key]) &&
              data.resources[key] >= 0 && data.resources[key] <= 100
          );

        if (
          data.app !== "OUTPOST" || data.saveVersion !== SAVE_VERSION ||
          !["moon", "mars"].includes(data.destination) ||
          !Number.isInteger(data.day) || data.day < 1 || data.day > 15 ||
          !validResources ||
          !["ACTIVE", "SUCCESS", "FAILED"].includes(data.missionStatus) ||
          !Number.isFinite(data.crewHealth) || !Number.isFinite(data.morale) ||
          !Number.isFinite(data.research) || !Array.isArray(data.upgrades) ||
          !Array.isArray(data.eventHistory)
        ) {
          throw new Error("This is not a valid OUTPOST save file.");
        }

        setDestination(data.destination);
        setStarted(Boolean(data.started));
        setDay(data.day);
        setResources(data.resources);
        setMessage(typeof data.message === "string" ? data.message : "Mission loaded.");
        setMissionStatus(data.missionStatus);
        setPendingEvent(data.pendingEvent ?? null);
        setLastEventId(data.lastEventId ?? null);
        setCrewRole(data.crewRole || "engineer");
        setAbilityUsed(Boolean(data.abilityUsed));
        setCrewHealth(Math.max(0, Math.min(100, data.crewHealth)));
        setMorale(Math.max(0, Math.min(100, data.morale)));
        setResearch(Math.max(0, data.research));
        setObjectiveId(data.objectiveId || "ice");
        setObjectiveProgress(Math.max(0, Math.min(100, data.objectiveProgress || 0)));
        setUpgrades(data.upgrades);
        setExtendedEvent(data.extendedEvent ?? null);
        setLastExtendedEventId(data.lastExtendedEventId ?? null);
        setEventHistory(data.eventHistory.slice(0, 30));
        setOperationUses({
          recycle: Math.max(0, data.operationUses?.recycle || 0),
          grow: Math.max(0, data.operationUses?.grow || 0),
          solar: Math.max(0, data.operationUses?.solar || 0)
        });
        setSaveNotice("MISSION LOADED SUCCESSFULLY");
      } catch (error) {
        setSaveNotice(error instanceof Error ? error.message : "Could not load this save file.");
      } finally {
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      setSaveNotice("Could not read the selected save file.");
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function startMission() {
    setResources({ ...STARTING_RESOURCES });
    setDay(1);
    setMissionStatus("ACTIVE");
    setPendingEvent(null);
    setLastEventId(null);
    setExtendedEvent(null);
    setLastExtendedEventId(null);
    setEventHistory([]);
    setCrewHealth(100);
    setMorale(85);
    setResearch(0);
    setObjectiveProgress(0);
    setUpgrades([]);
    setOperationUses({
  recycle: 0,
  grow: 0,
  solar: 0,
});
    setAbilityUsed(false);
    setMessage("Your crew has arrived. Good luck, Commander.");
    setStarted(true);
  }

  
function useAction(action) {
  if (missionStatus !== "ACTIVE" || pendingEvent || extendedEvent) return;

  if (operationUses[action] >= OPERATION_LIMITS[action]) {
    setMessage("Daily operation limit reached. Available again tomorrow.");
    return;
  }

  const next = { ...resources };

  if (action === "recycle") {
    if (next.power < 8) {
      setMessage("Insufficient power for water recycling.");
      return;
    }
    next.water = Math.min(100, next.water + 18);
    next.power -= 8;
    setMessage("Water recovery complete. +18 water, -8 power.");
  } else if (action === "grow") {
    if (next.power < 12) {
      setMessage("Insufficient power for greenhouse operations.");
      return;
    }
    next.food = Math.min(100, next.food + (upgrades.includes("crop-yield") ? 22 : 15));
    next.power -= 12;
    setMessage("Greenhouse harvest complete. Food reserves replenished.");
  } else if (action === "solar") {
    next.power = Math.min(100, next.power + 20);
    setMessage("Solar array operational. +20 power.");
  }

  setResources(next);
  setOperationUses(previous => ({
    ...previous,
    [action]: previous[action] + 1
  }));
}


  function activateCrewAbility() {
    if (abilityUsed || missionStatus !== "ACTIVE" || pendingEvent || extendedEvent) return;
    if (crewRole === "engineer") {
      setResources((previous) => ({ ...previous, power: Math.min(100, previous.power + 20) }));
      setMessage("Systems Engineer: emergency power reroute complete. +20 power.");
    } else if (crewRole === "scientist") {
      setResearch((value) => value + 15);
      setObjectiveProgress((value) => Math.min(100, value + 12));
      setMessage("Science Officer: rapid experiment completed. Research and objective progress increased.");
    } else if (crewRole === "medic") {
      setCrewHealth((value) => Math.min(100, value + 20));
      setMorale((value) => Math.min(100, value + 8));
      setMessage("Medical Officer: crew stabilised. +20 health.");
    } else {
      setResources((previous) => Object.fromEntries(
        Object.entries(previous).map(([key, value]) => [key, Math.min(100, value + 15)])
      ));
      setMessage("Commander: emergency rationing protocol activated. All reserves replenished.");
    }
    setAbilityUsed(true);
  }

  function resolveEvent(choice, extended = false) {
    const target = extended ? extendedEvent : pendingEvent;
    const result = applyEventEffects(resources, crewHealth, research, choice.effects);
    setResources(result.resources);
    setCrewHealth(result.health);
    setResearch(result.research);
    if (extended) setExtendedEvent(null);
    else setPendingEvent(null);
    setEventHistory((history) => [`${target.title}: ${choice.label}`, ...history].slice(0, 8));
    const failed = Object.values(result.resources).some((value) => value <= 0) || result.health <= 0;
    if (failed) {
      setMissionStatus("FAILED");
      setMessage("Critical resource or crew-health failure. Mission terminated.");
    } else {
      setMorale((value) => Math.max(0, Math.min(100, value + (choice.id === "shelter" ? 3 : -2))));
      setMessage(choice.feedback);
    }
  }

  function buyUpgrade(upgrade) {
    if (upgrades.includes(upgrade.id)) return;
    if (research < upgrade.cost) return setMessage(`Not enough research points for ${upgrade.name}.`);
    setResearch((value) => value - upgrade.cost);
    setUpgrades((current) => [...current, upgrade.id]);
    setMessage(`${upgrade.name} researched and installed.`);
  }

  function advanceDay() {
    if (missionStatus !== "ACTIVE" || pendingEvent || extendedEvent) return;
    const next = {
      water: Math.max(0, resources.water - consumption.water),
      oxygen: Math.max(0, resources.oxygen - consumption.oxygen),
      food: Math.max(0, resources.food - consumption.food),
      power: Math.max(0, resources.power - consumption.power),
    };
    setResources(next);
    setDay((previous) => previous + 1);
    setOperationUses({
  recycle: 0,
  grow: 0,
  solar: 0,
});
    setAbilityUsed(false);
    const healthLoss = resources.oxygen < 25 || resources.food < 25 ? 8 : 2;
    const nextHealth = Math.max(0, crewHealth - healthLoss);
    setCrewHealth(nextHealth);
    setMorale((value) => Math.max(0, value - (resources.food < 25 ? 5 : 1)));
    if (Object.values(next).some((value) => value <= 0) || nextHealth <= 0) {
      setMissionStatus("FAILED");
      setMessage("Critical life-support or crew-health failure. Mission failed.");
      return;
    }
    if (day >= 14) {
      setMissionStatus("SUCCESS");
      setObjectiveProgress((value) => Math.max(value, objective.target));
      setMessage("15-day mission completed! Crew survived the mission window.");
      return;
    }
    const roll = Math.random();
    if (roll < 0.22) {
      const event = pickMissionEvent(lastEventId);
      setPendingEvent(event);
      setLastEventId(event.id);
      setMessage("Outpost emergency detected. Command decision required.");
    } else if (roll < 0.42) {
      const event = chooseExtendedEvent(lastExtendedEventId);
      setExtendedEvent(event);
      setLastExtendedEventId(event.id);
      setMessage("Environmental or equipment anomaly detected. Crew response required.");
    } else {
      setMessage(`Day ${day + 1} complete. Crew health and outpost systems updated.`);
      setResearch((value) => value + 4);
      setObjectiveProgress((value) => Math.min(100, value + 5));
    }
  }

  const resourceStatus = (value) => value < 25 ? "CRITICAL" : value < 50 ? "LOW" : "NOMINAL";

  return (
    <main className="app">
      <input ref={loadInputRef} className="save-file-input" type="file"
        accept=".json,application/json" onChange={loadMissionFile} />
      <nav className="navbar">
        <div className="logo">OUTPOST<span>.</span></div>
        <div className="nav-label">MISSION TRAINER // 2026</div>
        <div className="status"><span className="status-dot"></span>SYSTEM ONLINE</div>
      </nav>

      {!started ? (
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">NASA SPACE APPS CHALLENGE // 2026</div>
            <h1>HUMANITY'S<br />NEXT <span>FRONTIER.</span></h1>
            <p className="description">One crew. One outpost. A thousand ways to survive. Take command of humanity's next settlement.</p>
            <h3 className="section-label">SELECT YOUR DESTINATION</h3>
            <div className="destination-grid">
              {["moon", "mars"].map((place) => (
                <button
                  key={place}
                  className={`destination-card ${destination === place ? "selected" : ""}`}
                  onClick={() => setDestination(place)}
                  aria-pressed={destination === place}
                >
                  <span className={`destination-thumb ${place}`} aria-hidden="true">
                    <img
                      src={place === "moon" ? "/assets/moon-thumb.png" : "/assets/mars-thumb.png"}
                      alt=""
                    />
                  </span>
                  <span className="destination-copy">
                    <span className="planet-name">{place.toUpperCase()}</span>
                    <span className="planet-detail">{place === "moon" ? "LUNAR SOUTH POLE" : "JEZERO REGION"} · OUTPOST</span>
                    <span className="selection">{destination === place ? "SELECTED ✓" : "SELECT DESTINATION"}</span>
                  </span>
                  <span className="destination-check" aria-hidden="true">{destination === place ? "✓" : "↗"}</span>
                </button>
              ))}
            </div>
            <button className="launch-button" onClick={startMission}>INITIALIZE MISSION →</button>
            <div className="save-menu-actions">
              <button className="back-button" onClick={() => loadInputRef.current?.click()}>
                LOAD SAVED MISSION
              </button>
            </div>
            {saveNotice && <p className="save-notice" role="status">{saveNotice}</p>}
            <div className="disclaimer">GAMEPLAY VALUES ARE ILLUSTRATIVE, NOT ENGINEERING SPECIFICATIONS</div>
          </div>
          <div
            className={`hero-visual ${destination}-visual`}
            onPointerMove={(event) => {
              if (event.pointerType === "touch") return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width - 0.5;
              const y = (event.clientY - bounds.top) / bounds.height - 0.5;
              setPlanetPointer({ x: x * 16, y: y * 12 });
            }}
            onPointerLeave={() => setPlanetPointer({ x: 0, y: 0 })}
          >
            <div className="hero-image-wrap">
              <PlanetSphere destination={destination} />
              <div className="hero-image-label">
                <span>DESTINATION // 0{destination === "moon" ? "1" : "2"}</span>
                <strong>{destination === "moon" ? "LUNAR SOUTH POLE" : "JEZERO CRATER"}</strong>
                <small>{destination === "moon" ? "MOON · 384,400 KM FROM EARTH" : "MARS · 225 MILLION KM FROM EARTH"}</small>
              </div>
            </div>
            <div className="visual-caption">{destination.toUpperCase()} SECTOR</div>
          </div>
        </section>
      ) : (
        <section className="mission">
          <div className="mission-heading">
            <div>
              <div className="eyebrow">MISSION CONTROL // {destination.toUpperCase()}</div>
              <h1>OUTPOST <span>COMMAND.</span></h1>
              <p className="description">Monitor your crew. Manage your resources. Survive 15 days.</p>
            </div>
            <div className="day-counter"><span>MISSION DAY</span><strong>{day}/15</strong></div>
          </div>

          <div className="mission-message"><span>◈ MISSION LOG</span><p>{message}</p></div>

          <h3 className="section-label">CREW STATUS & COMMAND</h3>
          <div className="xp-crew-grid">
            <div className="xp-panel">
              <div className="xp-panel-top"><span>ACTIVE SPECIALIST</span><span className="xp-chip">ROLE BONUS</span></div>
              <div className="xp-role-select">
                {CREW_ROLES.map((item) => (
                  <button key={item.id} className={`xp-role ${crewRole === item.id ? "active" : ""}`} onClick={() => { setCrewRole(item.id); setAbilityUsed(false); }}>
                    <span>{item.icon}</span><b>{item.name}</b>
                  </button>
                ))}
              </div>
              <p className="xp-role-detail">{role.passive}</p>
              <div className="xp-ability">
                <div><small>SPECIAL ABILITY</small><strong>{role.ability}</strong><span>{role.effect}</span></div>
                <button onClick={activateCrewAbility} disabled={abilityUsed || missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent}>{abilityUsed ? "USED" : "ACTIVATE"}</button>
              </div>
            </div>
            <div className="xp-panel crew-condition">
              <div className="xp-panel-top"><span>CREW CONDITION</span><span className="xp-chip">{morale >= 60 ? "STABLE" : "STRAINED"}</span></div>
              <div className="xp-condition-row"><span>HEALTH</span><b>{crewHealth}%</b></div>
              <div className="xp-track"><i className={crewHealth < 30 ? "danger" : ""} style={{ width: `${crewHealth}%` }} /></div>
              <div className="xp-condition-row"><span>MORALE</span><b>{morale}%</b></div>
              <div className="xp-track"><i className={morale < 30 ? "danger" : ""} style={{ width: `${morale}%` }} /></div>
              <div className="xp-condition-row"><span>MISSION SCORE</span><b>{score}/100</b></div>
              <div className="xp-track"><i style={{ width: `${score}%` }} /></div>
            </div>
          </div>

          {pendingEvent && <div className="event-panel"><div className="event-heading"><span>⚠ INCOMING MISSION EVENT</span><span className="event-severity">{pendingEvent.severity}</span></div><h2>{pendingEvent.title}</h2><p className="event-description">{pendingEvent.description}</p><div className="event-options">{pendingEvent.choices.map((choice) => <button className="event-choice" key={choice.id} onClick={() => resolveEvent(choice)}><strong>{choice.label}</strong><span>{choice.description}</span></button>)}</div></div>}

          {extendedEvent && <div className="event-panel extended-event"><div className="event-heading"><span>◈ ENVIRONMENTAL / SYSTEM ANOMALY</span><span className="event-severity">{extendedEvent.severity}</span></div><h2>{extendedEvent.title}</h2><p className="event-description">{extendedEvent.description}</p><div className="event-options">{extendedEvent.choices.map((choice) => <button className="event-choice" key={choice.id} onClick={() => resolveEvent(choice, true)}><strong>{choice.label}</strong><span>{choice.description}</span></button>)}</div></div>}

          <h3 className="section-label">LIFE SUPPORT SYSTEMS</h3>
          <div className="resource-grid">
            {resourceInfo.map((item) => {
              const amount = resources[item.key];
              return <div className="resource-card" key={item.key}>
                <div className="resource-top"><span>{item.icon} {item.label}</span><span>{amount}%</span></div>
                <div className="resource-track"><div className={`resource-fill ${amount < 30 ? "low" : ""}`} style={{ width: `${amount}%` }} /></div>
                <small>DAILY USE: {consumption[item.key]} UNITS · {resourceStatus(amount)}</small>
              </div>;
            })}
          </div>

        
<h3 className="section-label">OUTPOST OPERATIONS</h3>

<div className="xp-research-head">
  <span>DAILY OPERATIONS REMAINING</span>
  <strong>
    {Object.entries(OPERATION_LIMITS).reduce(
      (total, [key, limit]) => total + limit - operationUses[key],
      0
    )} / 4
  </strong>
</div>

<div className="action-grid">
  {[
    { id: "recycle", icon: "💧", name: "WATER RECYCLER", detail: "+18 water / -8 power" },
    { id: "grow", icon: "🌱", name: "GREENHOUSE", detail: `+${upgrades.includes("crop-yield") ? 22 : 15} food / -12 power` },
    { id: "solar", icon: "☀️", name: "SOLAR ARRAY", detail: "+20 power" },
  ].map((operation) => {
    const remaining = OPERATION_LIMITS[operation.id] - operationUses[operation.id];
    const disabled =
      remaining <= 0 ||
      missionStatus !== "ACTIVE" ||
      !!pendingEvent ||
      !!extendedEvent;

    return (
      <button
        key={operation.id}
        className="action-card"
        onClick={() => useAction(operation.id)}
        disabled={disabled}
      >
        <span>{operation.icon}</span>
        <strong>{operation.name}</strong>
        <small>{operation.detail}</small>
        <small>
          {remaining > 0
            ? `${remaining} / ${OPERATION_LIMITS[operation.id]} USES LEFT`
            : "DAILY LIMIT REACHED"}
        </small>
      </button>
    );
  })}
</div>


          <h3 className="section-label">RESEARCH & DEVELOPMENT</h3>
          <div className="xp-research-head"><span>RESEARCH POINTS</span><strong>{research} RP</strong></div>
          <div className="xp-research-grid">
            {RESEARCH_UPGRADES.map((upgrade) => (
              <div className={`xp-upgrade ${upgrades.includes(upgrade.id) ? "installed" : ""}`} key={upgrade.id}>
                <div><strong>{upgrade.name}</strong><small>{upgrade.description}</small></div>
                <button onClick={() => buyUpgrade(upgrade)} disabled={upgrades.includes(upgrade.id) || missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent}>{upgrades.includes(upgrade.id) ? "INSTALLED" : `RESEARCH · ${upgrade.cost} RP`}</button>
              </div>
            ))}
          </div>

          <h3 className="section-label">MISSION OBJECTIVE</h3>
          <div className="xp-objective">
            <div><span>{destination.toUpperCase()} // PRIMARY OBJECTIVE</span><strong>{objective.title}</strong><p>{objective.description}</p></div>
            <div className="xp-objective-progress"><b>{objectiveProgress}%</b><div className="xp-track"><i style={{ width: `${objectiveProgress}%` }} /></div><small>TARGET: {objective.target}%</small></div>
          </div>

          <h3 className="section-label">MISSION EVENT LOG</h3>
          <div className="xp-history">{eventHistory.length ? eventHistory.map((event, index) => <div key={`${event}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span>{event}</div>) : <p>No major incidents recorded. Mission systems nominal.</p>}</div>

          <div className="mission-footer">
            <button className="launch-button" onClick={advanceDay} disabled={missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent}>ADVANCE TO NEXT DAY →</button>
            <button className="back-button" onClick={saveMission}>SAVE MISSION ↓</button>
            <button className="back-button" onClick={() => loadInputRef.current?.click()}>LOAD SAVE ↑</button>
            <button className="back-button" onClick={() => setStarted(false)}>MENU</button>
          </div>
          {saveNotice && <p className="save-notice" role="status">{saveNotice}</p>}

          {missionStatus !== "ACTIVE" && <div className="mission-result"><h2>{missionStatus === "SUCCESS" ? "MISSION SUCCESS" : "MISSION FAILED"}</h2><p>{message}</p><p className="xp-final-score">FINAL MISSION SCORE: {score}/100</p><button className="launch-button" onClick={startMission}>RESTART MISSION</button></div>}
          <div className="disclaimer">SIMULATION VALUES ARE ILLUSTRATIVE. NOT REAL NASA LIFE-SUPPORT DATA.</div>
        </section>
      )}
    </main>
  );
}

export default App;
