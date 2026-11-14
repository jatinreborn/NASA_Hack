import { useState } from "react";
import "./App.css";
import { pickMissionEvent } from "./events/missionEvents";
import {
  CREW_ROLES, MISSION_OBJECTIVES, RESEARCH_UPGRADES,
  applyEventEffects, calculateDailyConsumption, calculateMissionScore,
  chooseExtendedEvent, getRole
} from "./game/gameplay";

const STARTING_RESOURCES = { water: 100, oxygen: 100, food: 100, power: 100 };
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
    setAbilityUsed(false);
    setMessage("Your crew has arrived. Good luck, Commander.");
    setStarted(true);
  }

  function useAction(action) {
    if (missionStatus !== "ACTIVE" || pendingEvent || extendedEvent) return;
    const next = { ...resources };
    if (action === "recycle") {
      if (next.power < 8) return setMessage("Not enough power to operate the water recycler!");
      next.water = Math.min(100, next.water + 18);
      next.power -= 8;
      setMessage("Water recycling system activated. +18 water.");
    } else if (action === "grow") {
      if (next.power < 12) return setMessage("Not enough power to operate the greenhouse!");
      next.food = Math.min(100, next.food + (upgrades.includes("crop-yield") ? 22 : 15));
      next.power -= 12;
      setMessage("Greenhouse harvest complete. Food reserves replenished.");
    } else if (action === "solar") {
      next.power = Math.min(100, next.power + 20);
      setMessage("Solar array recharged. +20 power.");
    }
    setResources(next);
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
                <button key={place} className={`destination-card ${destination === place ? "selected" : ""}`} onClick={() => setDestination(place)}>
                  <div className="planet">{place === "moon" ? "🌕" : "🔴"}</div>
                  <div className="planet-name">{place.toUpperCase()}</div>
                  <div className="planet-detail">{place === "moon" ? "LUNAR SOUTH POLE" : "JEZERO REGION"} · OUTPOST</div>
                  <div className="selection">{destination === place ? "SELECTED ✓" : "SELECT"}</div>
                </button>
              ))}
            </div>
            <button className="launch-button" onClick={startMission}>INITIALIZE MISSION →</button>
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
          <div className="action-grid">
            <button className="action-card" onClick={() => useAction("recycle")} disabled={missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent}><span>💧</span><strong>WATER RECYCLER</strong><small>+18 water / -8 power</small></button>
            <button className="action-card" onClick={() => useAction("grow")} disabled={missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent}><span>🌱</span><strong>GREENHOUSE</strong><small>+{upgrades.includes("crop-yield") ? 22 : 15} food / -12 power</small></button>
            <button className="action-card" onClick={() => useAction("solar")} disabled={missionStatus !== "ACTIVE" || !!pendingEvent || !!extendedEvent}><span>☀️</span><strong>SOLAR ARRAY</strong><small>+20 power</small></button>
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
            <button className="back-button" onClick={() => setStarted(false)}>ABORT / MENU</button>
          </div>

          {missionStatus !== "ACTIVE" && <div className="mission-result"><h2>{missionStatus === "SUCCESS" ? "MISSION SUCCESS" : "MISSION FAILED"}</h2><p>{message}</p><p className="xp-final-score">FINAL MISSION SCORE: {score}/100</p><button className="launch-button" onClick={startMission}>RESTART MISSION</button></div>}
          <div className="disclaimer">SIMULATION VALUES ARE ILLUSTRATIVE. NOT REAL NASA LIFE-SUPPORT DATA.</div>
        </section>
      )}
    </main>
  );
}

export default App;
