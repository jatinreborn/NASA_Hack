export const CREW_ROLES = [
  { id:"engineer", name:"SYSTEMS ENGINEER", icon:"⚙", passive:"Daily power consumption reduced by 2.", ability:"Emergency Repair", effect:"Restore 20 power once per mission." },
  { id:"scientist", name:"SCIENCE OFFICER", icon:"⌬", passive:"Daily food consumption reduced by 2.", ability:"Rapid Experiment", effect:"Gain 15 research points and objective progress." },
  { id:"medic", name:"MEDICAL OFFICER", icon:"✚", passive:"Daily oxygen consumption reduced by 2.", ability:"Medical Stabilisation", effect:"Restore 20 crew health and 8 morale." },
  { id:"commander", name:"MISSION COMMANDER", icon:"★", passive:"Daily water consumption reduced by 2.", ability:"Emergency Rationing", effect:"Restore 15 units to all reserves." },
];



export const OPERATION_LIMITS = {
  recycle: 2, // Water recycler: twice per day
  grow: 1,    // Greenhouse: once per day
  solar: 1,   // Solar array: once per day
};

export const MISSION_OBJECTIVES = {
  moon: [
    {id:"ice",title:"Polar Ice Reconnaissance",description:"Survey a permanently shadowed region and identify potential water-ice deposits.",target:60},
    {id:"habitat",title:"Habitat Readiness Trial",description:"Keep life-support systems stable while testing surface infrastructure.",target:50},
    {id:"geology",title:"Lunar Geology Survey",description:"Collect and transmit useful geological observations.",target:70}
  ],
  mars: [
    {id:"ice",title:"Subsurface Resource Survey",description:"Assess accessible water resources and map promising terrain.",target:65},
    {id:"habitat",title:"Surface Habitat Trial",description:"Maintain a stable habitat through dust and thermal hazards.",target:55},
    {id:"geology",title:"Jezero Geological Survey",description:"Collect geological observations and return useful science data.",target:75}
  ]
};
export const RESEARCH_UPGRADES = [
  {id:"closed-loop",name:"Closed-loop Water Recovery",cost:30,description:"Reduce daily water consumption by 2."},
  {id:"efficient-power",name:"Power Management Software",cost:35,description:"Reduce daily power consumption by 3."},
  {id:"crop-yield",name:"Controlled Environment Agriculture",cost:40,description:"Increase greenhouse harvest from 15 to 22 food."},
  {id:"radiation",name:"Radiation Shelter Upgrade",cost:45,description:"Reduce crew health loss from severe space-weather events."}
];
export const EXTENDED_EVENTS = [
  {id:"micrometeorite",title:"MICROMETEORITE IMPACT",severity:"CRITICAL",description:"A small impact has damaged an external service line. Choose a rapid patch or controlled shutdown.",choices:[
    {id:"patch",label:"PATCH THE LINE",description:"Spend power to keep the system online.",effects:{power:-12,health:-4},feedback:"The line was patched. Some power and crew energy were spent."},
    {id:"shutdown",label:"CONTROLLED SHUTDOWN",description:"Protect the crew, but lose stored resources during isolation.",effects:{water:-10,power:-5},feedback:"The system was isolated safely, but stored water was lost."}
  ]},
  {id:"radiation",title:"SPACE-WEATHER ALERT",severity:"CRITICAL",description:"Elevated radiation levels are forecast. The crew should shelter or continue planned surface activity.",choices:[
    {id:"shelter",label:"MOVE TO SHELTER",description:"Delay surface work and protect crew health.",effects:{power:-8},feedback:"The crew sheltered. The science timeline has been delayed."},
    {id:"continue",label:"CONTINUE OPERATIONS",description:"Keep the schedule, accepting greater crew exposure.",effects:{health:-18},feedback:"The team completed the work but sustained a serious health impact."}
  ]},
  {id:"greenhouse",title:"GREENHOUSE CONTAMINATION",severity:"WARNING",description:"A contamination warning has been raised in the growth chamber. Decide how much of the crop to quarantine.",choices:[
    {id:"quarantine",label:"QUARANTINE THE CROP",description:"Lose some food but protect future harvests.",effects:{food:-12,power:-4},feedback:"The affected crop was quarantined. Future harvests remain protected."},
    {id:"salvage",label:"ATTEMPT SALVAGE",description:"Save supplies now, risking a wider failure.",effects:{food:-5,health:-8},feedback:"Some food was saved, but crew health risk increased."}
  ]},
  {id:"thermal",title:"THERMAL CONTROL ANOMALY",severity:"WARNING",description:"A thermal control loop is behaving unpredictably. Non-essential systems can be powered down while the crew investigates.",choices:[
    {id:"shed",label:"SHED NON-ESSENTIAL LOAD",description:"Protect critical equipment at the cost of research time.",effects:{power:8,research:-5},feedback:"Load shedding stabilised the habitat. Some research time was lost."},
    {id:"continue-load",label:"MAINTAIN FULL OPERATIONS",description:"Preserve the timeline but risk power instability.",effects:{power:-14},feedback:"Full operations continued. The power reserve took a hit."}
  ]}
];
export function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,value));}
export function getRole(id){return CREW_ROLES.find(role=>role.id===id)||CREW_ROLES[0];}
export function calculateDailyConsumption(roleId,upgrades=[]){
  const c={water:7,oxygen:6,food:8,power:10};
  if(roleId==="engineer")c.power-=2;
  if(roleId==="scientist")c.food-=2;
  if(roleId==="medic")c.oxygen-=2;
  if(roleId==="commander")c.water-=2;
  if(upgrades.includes("closed-loop"))c.water-=2;
  if(upgrades.includes("efficient-power"))c.power-=3;
  return c;
}
export function chooseExtendedEvent(previousId=null){
  const pool=EXTENDED_EVENTS.filter(event=>event.id!==previousId);
  const items=pool.length?pool:EXTENDED_EVENTS;
  return items[Math.floor(Math.random()*items.length)];
}
export function applyEventEffects(resources,health,research,effects={}){
  const next={...resources};let nextHealth=health;let nextResearch=research;
  Object.entries(effects).forEach(([key,amount])=>{
    if(key==="health")nextHealth=clamp(nextHealth+amount);
    else if(key==="research")nextResearch=Math.max(0,nextResearch+amount);
    else if(key in next)next[key]=clamp(next[key]+amount);
  });
  return {resources:next,health:nextHealth,research:nextResearch};
}
export function calculateMissionScore({health,resources,research,objectiveProgress,missionDays,completed}){
  const avg=Object.values(resources).reduce((a,b)=>a+b,0)/4;
  return Math.round(clamp(avg*.28+health*.22+Math.min(research,100)*.22+Math.min(objectiveProgress,100)*.23+(completed?5:0)-Math.max(0,missionDays-15)*1.5));
}
