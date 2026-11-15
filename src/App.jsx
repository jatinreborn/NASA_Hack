import { useRef, useState } from "react";
import "./App.css";
import { pickMissionEvent } from "./events/missionEvents";
import {
  CREW_ROLES, MISSION_OBJECTIVES, RESEARCH_UPGRADES, OPERATION_LIMITS, SAVE_VERSION,
  applyEventEffects, calculateDailyConsumption, calculateMissionScore,
  chooseExtendedEvent, getRole
} from "./game/gameplay";

const STARTING_RESOURCES = { water: 100, oxygen: 100, food: 100, power: 100 };
const STARTING_MEDICAL_KITS = 3;
const resourceInfo = [
  { key: "water", label: "WATER", icon: "💧" },
  { key: "oxygen", label: "OXYGEN", icon: "🫧" },
  { key: "food", label: "FOOD", icon: "🥬" },
  { key: "power", label: "POWER", icon: "⚡" },
];

function App() {
  const [destination, setDestination] = useState("moon");
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
    recycle: 0, grow: 0, solar: 0, maintenance: 0,
    treatment: 0, rest: 0, explore: 0, diagnostics: 0,
  });
  const [medicalKits, setMedicalKits] = useState(STARTING_MEDICAL_KITS);
  const [fatigue, setFatigue] = useState(0);
  const [systemIntegrity, setSystemIntegrity] = useState(100);
  const [saveNotice, setSaveNotice] = useState("");
  const loadInputRef = useRef(null);

  const role = getRole(crewRole);
  const objective = MISSION_OBJECTIVES[destination].find((item) => item.id === objectiveId);
  const consumption = calculateDailyConsumption(crewRole, upgrades);
  const score = calculateMissionScore({
    health: crewHealth, resources, research, objectiveProgress,
    missionDays: day, completed: missionStatus === "SUCCESS"
  });

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
      recycle: 0, grow: 0, solar: 0, maintenance: 0,
      treatment: 0, rest: 0, explore: 0, diagnostics: 0,
    });
    setMedicalKits(STARTING_MEDICAL_KITS);
    setFatigue(0);
    setSystemIntegrity(100);
    setCrewRole("engineer");
    setAbilityUsed(false);
    setMessage("Your crew has arrived. Good luck, Commander.");
    setStarted(true);
  }

  
function useAction(action) {
    if (missionStatus !== "ACTIVE" || pendingEvent || extendedEvent) return;
    const limit = OPERATION_LIMITS[action];
    if (limit === undefined) return;
    if (operationUses[action] >= limit) {
      setMessage("Daily operation limit reached. Available again next SOL.");
      return;
    }

    const next = { ...resources };
    let nextHealth = crewHealth;
    let nextMorale = morale;
    let nextFatigue = fatigue;
    let nextIntegrity = systemIntegrity;
    let nextResearch = research;
    let nextObjective = objectiveProgress;
    let nextKits = medicalKits;

    if (action === "recycle") {
      if (next.power < 8) return setMessage("Insufficient power for water recovery.");
      if (next.water >= 100) return setMessage("Water reserves are already full. Save this action.");
      next.water = Math.min(100, next.water + 18);
      next.power -= 8;
      setMessage("Water recovery complete. +18 water, -8 power.");
    } else if (action === "grow") {
      if (next.power < 12) return setMessage("Insufficient power for greenhouse operations.");
      if (next.food >= 100) return setMessage("Food reserves are already full. Save this action.");
      next.food = Math.min(100, next.food + (upgrades.includes("crop-yield") ? 22 : 15));
      next.power -= 12;
      setMessage("Greenhouse harvest complete. Food reserves replenished.");
    } else if (action === "solar") {
      if (next.power >= 100) return setMessage("Power reserves are already full. Save this action.");
      next.power = Math.min(100, next.power + 20);
      setMessage("Solar array operational. +20 power.");
    } else if (action === "maintenance") {
      if (next.power < 15) return setMessage("Maintenance requires 15 power.");
      if (nextIntegrity >= 100) return setMessage("Outpost systems are already at full integrity.");
      next.power -= 15;
      nextIntegrity = Math.min(100, nextIntegrity + (crewRole === "engineer" ? 35 : 22));
      setMessage(`Maintenance complete. System integrity restored to ${nextIntegrity}%.`);
    } else if (action === "treatment") {
      if (nextKits <= 0) return setMessage("No medical kits remain.");
      if (nextHealth >= 100 && nextFatigue < 10) return setMessage("Crew condition is stable. Save medical supplies.");
      nextKits -= 1;
      nextHealth = Math.min(100, nextHealth + (crewRole === "medic" ? 32 : 22));
      nextFatigue = Math.max(0, nextFatigue - 12);
      setMessage(`Medical treatment complete. Crew health is now ${nextHealth}%.`);
    } else if (action === "rest") {
      nextFatigue = Math.max(0, nextFatigue - 30);
      nextMorale = Math.min(100, nextMorale + (crewRole === "commander" ? 22 : 15));
      setMessage("Crew rest complete. Fatigue reduced and morale improved.");
    } else if (action === "explore") {
      if (next.oxygen < 8 || next.food < 5) return setMessage("Exploration requires at least 8 oxygen and 5 food.");
      next.oxygen -= 8;
      next.food -= 5;
      nextHealth = Math.max(0, nextHealth - (Math.random() < 0.25 ? 8 : 2));
      nextFatigue = Math.min(100, nextFatigue + 15);
      nextResearch += crewRole === "scientist" ? 20 : 12;
      nextObjective = Math.min(100, nextObjective + 15);
      setMessage("Surface survey complete. Research gained; oxygen, food and crew energy expended.");
    } else if (action === "diagnostics") {
      if (next.power < 5) return setMessage("Diagnostics require 5 power.");
      next.power -= 5;
      nextIntegrity = Math.min(100, nextIntegrity + 5);
      nextResearch += 5;
      setMessage("Diagnostics complete. +5 research and a minor integrity correction.");
    }

    setResources(next);
    setCrewHealth(nextHealth);
    setMorale(nextMorale);
    setFatigue(nextFatigue);
    setSystemIntegrity(nextIntegrity);
    setResearch(nextResearch);
    setObjectiveProgress(nextObjective);
    setMedicalKits(nextKits);
    setOperationUses(previous => ({ ...previous, [action]: previous[action] + 1 }));
  }

  function activateCrewAbility() {
    if (abilityUsed || missionStatus !== "ACTIVE" || pendingEvent || extendedEvent) return;
    if (crewRole === "engineer") {
      setResources((previous) => ({ ...previous, power: Math.min(100, previous.power + 20) }));
      setSystemIntegrity((value) => Math.min(100, value + 20));
      setMessage("Systems Engineer: emergency repair complete. +20 power and system integrity.");
    } else if (crewRole === "scientist") {
      setResearch((value) => value + 15);
      setObjectiveProgress((value) => Math.min(100, value + 12));
      setMessage("Science Officer: rapid experiment completed. Research and objective progress increased.");
    } else if (crewRole === "medic") {
      setCrewHealth((value) => Math.min(100, value + 20));
      setMorale((value) => Math.min(100, value + 8));
      setFatigue((value) => Math.max(0, value - 15));
      setMessage("Medical Officer: crew stabilised. +20 health and reduced fatigue.");
    } else {
      setResources((previous) => Object.fromEntries(
        Object.entries(previous).map(([key, value]) => [key, Math.min(100, value + 15)])
      ));
      setMorale((value) => Math.min(100, value + 10));
      setMessage("Commander: emergency rationing protocol activated. Reserves and crew confidence improved.");
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
      recycle: 0, grow: 0, solar: 0, maintenance: 0,
      treatment: 0, rest: 0, explore: 0, diagnostics: 0,
    });
    setAbilityUsed(false);
    const healthLoss = resources.oxygen < 25 || resources.food < 25 ? 8 : (fatigue >= 75 ? 5 : 2);
    const nextHealth = Math.max(0, crewHealth - healthLoss);
    setCrewHealth(nextHealth);
    setFatigue((value) => Math.min(100, value + 8));
    setSystemIntegrity((value) => Math.max(0, value - 2));
    setMorale((value) => Math.max(0, value - (resources.food < 25 ? 5 : 1) - (fatigue >= 80 ? 2 : 0)));
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

  function buildSaveData() {
    return {
      app: "OUTPOST",
      saveVersion: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      state: {
        destination, started, day, resources, message, missionStatus,
        pendingEvent, lastEventId, crewRole, abilityUsed, crewHealth, morale,
        research, objectiveId, objectiveProgress, upgrades, extendedEvent,
        lastExtendedEventId, eventHistory, operationUses, medicalKits,
        fatigue, systemIntegrity,
      },
    };
  }

  function saveMission() {
    const blob = new Blob([JSON.stringify(buildSaveData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `outpost-${destination}-sol-${day}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSaveNotice("Mission save downloaded.");
  }

  function loadMissionFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const save = JSON.parse(String(reader.result));
        if (save.app !== "OUTPOST" || save.saveVersion !== SAVE_VERSION || !save.state) {
          throw new Error("Unsupported OUTPOST save file.");
        }
        const s = save.state;
        if (!["moon", "mars"].includes(s.destination) || !Number.isFinite(s.day) ||
            !s.resources || !["ACTIVE", "SUCCESS", "FAILED"].includes(s.missionStatus)) {
          throw new Error("Save file is missing required mission data.");
        }
        setDestination(s.destination);
        setStarted(Boolean(s.started));
        setDay(s.day);
        setResources({ ...STARTING_RESOURCES, ...s.resources });
        setMessage(s.message || "Mission loaded.");
        setMissionStatus(s.missionStatus);
        setPendingEvent(s.pendingEvent || null);
        setLastEventId(s.lastEventId || null);
        setCrewRole(CREW_ROLES.some((r) => r.id === s.crewRole) ? s.crewRole : "engineer");
        setAbilityUsed(Boolean(s.abilityUsed));
        setCrewHealth(Number.isFinite(s.crewHealth) ? s.crewHealth : 100);
        setMorale(Number.isFinite(s.morale) ? s.morale : 85);
        setResearch(Number.isFinite(s.research) ? s.research : 0);
        setObjectiveId(s.objectiveId || "ice");
        setObjectiveProgress(Number.isFinite(s.objectiveProgress) ? s.objectiveProgress : 0);
        setUpgrades(Array.isArray(s.upgrades) ? s.upgrades : []);
        setExtendedEvent(s.extendedEvent || null);
        setLastExtendedEventId(s.lastExtendedEventId || null);
        setEventHistory(Array.isArray(s.eventHistory) ? s.eventHistory : []);
        setOperationUses({ ...Object.fromEntries(Object.keys(OPERATION_LIMITS).map((key) => [key, 0])), ...(s.operationUses || {}) });
        setMedicalKits(Number.isFinite(s.medicalKits) ? s.medicalKits : STARTING_MEDICAL_KITS);
        setFatigue(Number.isFinite(s.fatigue) ? s.fatigue : 0);
        setSystemIntegrity(Number.isFinite(s.systemIntegrity) ? s.systemIntegrity : 100);
        setSaveNotice("Mission loaded successfully.");
      } catch (error) {
        setSaveNotice(error.message || "Unable to load this save file.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  const resourceStatus = (value) => value < 25 ? "CRITICAL" : value < 50 ? "LOW" : "NOMINAL";

  return (
    <main className="app">
      <nav className="navbar">
        <div className="logo">OUTPOST<span>.</span></div>
        <div className="nav-label">MISSION TRAINER // 2026</div>
        <div className="status"><span className="status-dot"></span>SYSTEM ONLINE</div>
      </nav>
      <input ref={loadInputRef} className="save-file-input" type="file" accept=".json,application/json" onChange={loadMissionFile} />

      {!started ? (
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">NASA SPACE APPS CHALLENGE // 2026</div>
            <h1>HUMANITY'S<br />NEXT <span>FRONTIER.</span></h1>
            <p className="description">One crew. One outpost. A thousand ways to survive. Take command of humanity's next settlement.</p>
            <h3 className="section-label">SELECT YOUR DESTINATION</h3>
            <div className="destination-grid">
              {["moon", "mars"].map((place) => (
                <button key={place} className={`destination-card ${destination === place ? "selected" : ""}`} onClick={() => setDestination(place)}>
                  <div className="planet">{place === "moon" ? "🌕" : "🔴"}</div>
                  <div className="planet-name">{place.toUpperCase()}</div>
                  <div className="planet-detail">{place === "moon" ? "LUNAR SOUTH POLE" : "JEZERO REGION"} · OUTPOST</div>
                  <div className="selection">{destination === place ? "SELECTED ✓" : "SELECT"}</div>
                </button>
              ))}
            </div>
            <button className="launch-button" onClick={startMission}>INITIALIZE MISSION →</button>
            <button className="back-button landing-load-button" onClick={() => loadInputRef.current?.click()}>LOAD EXISTING MISSION ↑</button>
            {saveNotice && <p className="save-notice" role="status">{saveNotice}</p>}
            <div className="disclaimer">GAMEPLAY VALUES ARE ILLUSTRATIVE, NOT ENGINEERING SPECIFICATIONS</div>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div>
            <div className="planet-large">{destination === "moon" ? "🌕" : "🔴"}</div>
            <div className="visual-caption">{destination.toUpperCase()} SECTOR</div>
          </div>
        </section>
      ) : (
        <section className="mission">
          <div className="mission-heading">
            <div>
              <div className="eyebrow">MISSION CONTROL // {destination.toUpperCase()}</div>
              <h1>OUTPOST <span>COMMAND CENTER.</span></h1>
              <p className="description">Lead your crew. Balance critical supplies. Keep the outpost operational for 15 sols.</p>
            </div>
            <div className="day-counter"><span>SOL</span><strong>{day}/15</strong></div>
          </div>

          <div className="mission-message"><span>◈ LATEST MISSION UPDATE</span><p>{message}</p></div>

          <h3 className="section-label">CREW & SPECIALIST STATUS</h3>
          <div className="xp-crew-grid">
            <div className="xp-panel">
              <div className="xp-panel-top"><span>ASSIGNED SPECIALIST</span><span className="xp-chip">ROLE BONUS</span></div>
              <div className="xp-role-select">
                {CREW_ROLES.map((item) => (
                  <button key={item.id} className={`xp-role ${crewRole === item.id ? "active" : ""}`} onClick={() => setCrewRole(item.id)}>
                    <span>{item.icon}</span><b>{item.name}</b>
                  </button>
                ))}
              </div>
              <p className="xp-role-detail">{role.passive}</p>
              <div className="xp-ability">
                <div><small>SPECIALIST ABILITY</small><strong>{role.ability}</strong><span>{role.effect}</span></div>
                <button onClick={activateCrewAbility} disabled={abilityUsed || missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent}>{abilityUsed ? "USED" : "USE ABILITY"}</button>
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
              <div className="xp-condition-row"><span>FATIGUE</span><b>{fatigue}%</b></div>
              <div className="xp-track"><i className={fatigue >= 70 ? "danger" : ""} style={{ width: `${fatigue}%` }} /></div>
              <div className="xp-condition-row"><span>SYSTEM INTEGRITY</span><b>{systemIntegrity}%</b></div>
              <div className="xp-track"><i className={systemIntegrity < 35 ? "danger" : ""} style={{ width: `${systemIntegrity}%` }} /></div>
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
            <span>DAILY OPERATIONS REMAINING · MEDICAL KITS: {medicalKits}</span>
            <strong>
              {Object.entries(OPERATION_LIMITS).reduce(
                (total, [key, limit]) => total + limit - operationUses[key], 0
              )} / {Object.values(OPERATION_LIMITS).reduce((sum, value) => sum + value, 0)}
            </strong>
          </div>

          <div className="action-grid outpost-action-grid">
            {[
              { id: "recycle", icon: "💧", name: "WATER RECYCLER", detail: "+18 water / -8 power" },
              { id: "grow", icon: "🌱", name: "GREENHOUSE", detail: `+${upgrades.includes("crop-yield") ? 22 : 15} food / -12 power` },
              { id: "solar", icon: "☀️", name: "SOLAR ARRAY", detail: "+20 power" },
              { id: "maintenance", icon: "🛠️", name: "EMERGENCY MAINTENANCE", detail: "Restore system integrity / -15 power" },
              { id: "treatment", icon: "✚", name: "MEDICAL TREATMENT", detail: "Restore crew health / -1 medical kit" },
              { id: "rest", icon: "🛌", name: "CREW REST", detail: "Reduce fatigue / improve morale" },
              { id: "explore", icon: "🚀", name: "SURFACE EXPLORATION", detail: "Research + objective progress / resource cost" },
              { id: "diagnostics", icon: "⌁", name: "SYSTEM DIAGNOSTICS", detail: "+5 research / -5 power" },
            ].map((operation) => {
              const remaining = OPERATION_LIMITS[operation.id] - operationUses[operation.id];
              const disabled = remaining <= 0 || missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent;
              return (
                <button key={operation.id} className="action-card" onClick={() => useAction(operation.id)} disabled={disabled}>
                  <span>{operation.icon}</span>
                  <strong>{operation.name}</strong>
                  <small>{operation.detail}</small>
                  <small>{remaining > 0 ? `${remaining} / ${OPERATION_LIMITS[operation.id]} USES LEFT` : "DAILY LIMIT REACHED"}</small>
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

          <div className="mission-footer mission-actions-footer">
            <button className="launch-button" onClick={advanceDay} disabled={missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent}>ADVANCE TO NEXT SOL →</button>
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
