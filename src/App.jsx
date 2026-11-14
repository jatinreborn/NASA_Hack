
import { useState } from "react";
import "./App.css";

const STARTING_RESOURCES = {
  water: 100,
  oxygen: 100,
  food: 100,
  power: 100,
};

const resourceInfo = [
  { key: "water", label: "WATER", icon: "💧", daily: 7 },
  { key: "oxygen", label: "OXYGEN", icon: "🫧", daily: 6 },
  { key: "food", label: "FOOD", icon: "🥬", daily: 8 },
  { key: "power", label: "POWER", icon: "⚡", daily: 10 },
];

function App() {
  const [destination, setDestination] = useState("moon");
  const [started, setStarted] = useState(false);
  const [day, setDay] = useState(1);
  const [resources, setResources] = useState(STARTING_RESOURCES);
  const [message, setMessage] = useState("Mission ready. Protect your crew.");

  const [missionStatus, setMissionStatus] = useState("ACTIVE");

  function startMission() {
    setResources(STARTING_RESOURCES);
    setDay(1);
    setMissionStatus("ACTIVE");
    setMessage("Your crew has arrived. Good luck, Commander.");
    setStarted(true);
  }

  function useAction(action) {
    if (missionStatus !== "ACTIVE") return;

    setResources((previous) => {
      const next = { ...previous };

      if (action === "recycle") {
        if (next.power < 8) {
          setMessage("Not enough power to operate the water recycler!");
          return previous;
        }
        next.water = Math.min(100, next.water + 18);
        next.power -= 8;
        setMessage("Water recycling system activated. +18 water.");
      }

      if (action === "grow") {
        if (next.power < 12) {
          setMessage("Not enough power to operate the greenhouse!");
          return previous;
        }
        next.food = Math.min(100, next.food + 15);
        next.power -= 12;
        setMessage("Greenhouse harvest complete. +15 food.");
      }

      if (action === "solar") {
        next.power = Math.min(100, next.power + 20);
        setMessage("Solar array recharged. +20 power.");
      }

      return next;
    });
  }

  function advanceDay() {
    if (missionStatus !== "ACTIVE") return;

    const next = {
      water: Math.max(0, resources.water - 7),
      oxygen: Math.max(0, resources.oxygen - 6),
      food: Math.max(0, resources.food - 8),
      power: Math.max(0, resources.power - 10),
    };

    const failed = Object.values(next).some((value) => value <= 0);

    setResources(next);
    setDay((previous) => previous + 1);

    if (failed) {
      setMissionStatus("FAILED");
      setMessage("Critical resource shortage. Mission failed.");
    } else if (day >= 14) {
      setMissionStatus("SUCCESS");
      setMessage("15-day mission completed! Your crew survived.");
    } else {
      setMessage(`Day ${day + 1} complete. All systems updated.`);
    }
  }

  return (
    <main className="app">
      <nav className="navbar">
        <div className="logo">OUTPOST<span>.</span></div>
        <div className="nav-label">MISSION TRAINER // 2026</div>
        <div className="status">
          <span className="status-dot"></span>
          SYSTEM ONLINE
        </div>
      </nav>

      {!started ? (
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">NASA SPACE APPS CHALLENGE // 2026</div>
            <h1>HUMANITY'S<br />NEXT <span>FRONTIER.</span></h1>
            <p className="description">
              One crew. One outpost. A thousand ways to survive.
              Take command of humanity's next settlement.
            </p>

            <h3 className="section-label">SELECT YOUR DESTINATION</h3>

            <div className="destination-grid">
              {["moon", "mars"].map((place) => (
                <button
                  key={place}
                  className={`destination-card ${destination === place ? "selected" : ""}`}
                  onClick={() => setDestination(place)}
                >
                  <div className="planet">
                    {place === "moon" ? "🌕" : "🔴"}
                  </div>
                  <div className="planet-name">{place.toUpperCase()}</div>
                  <div className="planet-detail">OUTPOST</div>
                  <div className="selection">
                    {destination === place ? "SELECTED ✓" : "SELECT"}
                  </div>
                </button>
              ))}
            </div>

            <button className="launch-button" onClick={startMission}>
              INITIALIZE MISSION →
            </button>
            <div className="disclaimer">
              GAMEPLAY VALUES ARE ILLUSTRATIVE, NOT ENGINEERING SPECIFICATIONS
            </div>
          </div>

          <div className="hero-visual">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="planet-large">
              {destination === "moon" ? "🌕" : "🔴"}
            </div>
            <div className="visual-caption">
              {destination.toUpperCase()} SECTOR
            </div>
          </div>
        </section>
      ) : (
        <section className="mission">
          <div className="mission-heading">
            <div>
              <div className="eyebrow">MISSION CONTROL // {destination.toUpperCase()}</div>
              <h1>OUTPOST <span>COMMAND.</span></h1>
              <p className="description">
                Monitor your crew. Manage your resources. Survive 15 days.
              </p>
            </div>

            <div className="day-counter">
              <span>MISSION DAY</span>
              <strong>{day}/15</strong>
            </div>
          </div>

          <div className="mission-message">
            <span>◈ MISSION LOG</span>
            <p>{message}</p>
          </div>

          <h3 className="section-label">LIFE SUPPORT SYSTEMS</h3>

          <div className="resource-grid">
            {resourceInfo.map((item) => {
              const amount = resources[item.key];
              return (
                <div className="resource-card" key={item.key}>
                  <div className="resource-top">
                    <span>{item.icon} {item.label}</span>
                    <span>{amount}%</span>
                  </div>
                  <div className="resource-track">
                    <div
                      className={`resource-fill ${amount < 30 ? "low" : ""}`}
                      style={{ width: `${amount}%` }}
                    ></div>
                  </div>
                  <small>DAILY CONSUMPTION: {item.daily} UNITS</small>
                </div>
              );
            })}
          </div>

          <h3 className="section-label">OUTPOST OPERATIONS</h3>

          <div className="action-grid">
            <button className="action-card" onClick={() => useAction("recycle")}>
              <span>💧</span>
              <strong>WATER RECYCLER</strong>
              <small>+18 water / -8 power</small>
            </button>

            <button className="action-card" onClick={() => useAction("grow")}>
              <span>🌱</span>
              <strong>GREENHOUSE</strong>
              <small>+15 food / -12 power</small>
            </button>

            <button className="action-card" onClick={() => useAction("solar")}>
              <span>☀️</span>
              <strong>SOLAR ARRAY</strong>
              <small>+20 power</small>
            </button>
          </div>

          <div className="mission-footer">
            <button
              className="launch-button"
              onClick={advanceDay}
              disabled={missionStatus !== "ACTIVE"}
            >
              ADVANCE TO NEXT DAY →
            </button>

            <button
              className="back-button"
              onClick={() => setStarted(false)}
            >
              ABORT / MENU
            </button>
          </div>

          {missionStatus !== "ACTIVE" && (
            <div className="mission-result">
              <h2>{missionStatus === "SUCCESS" ? "MISSION SUCCESS" : "MISSION FAILED"}</h2>
              <p>{message}</p>
              <button className="launch-button" onClick={startMission}>
                RESTART MISSION
              </button>
            </div>
          )}

          <div className="disclaimer">
            SIMULATION UNITS ARE ILLUSTRATIVE. NOT REAL NASA LIFE-SUPPORT DATA.
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
