export const MISSION_EVENTS = [
  { id:"dust-storm", title:"DUST STORM DETECTED", severity:"WARNING", description:"A powerful dust storm is approaching the outpost. Dust is beginning to cover the solar panels, threatening power generation.", choices:[
    {id:"secure-panels",label:"SECURE THE SOLAR ARRAY",description:"Send the maintenance crew to protect the panels. This uses power but limits further damage.",effects:{power:-8},feedback:"The solar panels were secured successfully. The crew spent 8 power protecting the array."},
    {id:"wait-storm",label:"WAIT OUT THE STORM",description:"Keep the crew inside and let the storm pass. Exposed systems will consume additional power.",effects:{power:-16},feedback:"The storm has passed, but exposed equipment caused an additional loss of 16 power."}
  ]},
  { id:"water-leak", title:"WATER LEAK DETECTED", severity:"CRITICAL", description:"A leak has been detected in the outpost's water distribution system. The crew must decide how to contain it.", choices:[
    {id:"repair-leak",label:"REPAIR THE PIPELINE",description:"Send the maintenance crew to repair the damaged section. This costs power and a small amount of water.",effects:{power:-6,water:-3},feedback:"The damaged pipeline has been repaired. The operation consumed 6 power and 3 water."},
    {id:"isolate-pipeline",label:"ISOLATE THE PIPELINE",description:"Shut down the damaged section immediately. This prevents further damage but wastes stored water.",effects:{water:-14},feedback:"The damaged pipeline was isolated. The outpost lost 14 water during the incident."}
  ]},
  { id:"solar-storm", title:"SOLAR STORM WARNING", severity:"CRITICAL", description:"A solar storm is affecting the outpost's electrical systems. Power fluctuations have been detected across several modules.", choices:[
    {id:"safe-mode",label:"ACTIVATE SAFE MODE",description:"Temporarily reduce electrical activity to protect critical systems.",effects:{power:-7},feedback:"Safe mode protected the outpost's critical systems. 7 power was consumed."},
    {id:"maintain-operations",label:"MAINTAIN NORMAL OPERATIONS",description:"Keep all systems running. This maintains productivity but increases power losses.",effects:{power:-17},feedback:"Normal operations continued, but electrical instability caused an additional loss of 17 power."}
  ]}
];
export function pickMissionEvent(previousEventId=null) {
  let availableEvents=MISSION_EVENTS.filter(event=>event.id!==previousEventId);
  if(availableEvents.length===0) availableEvents=MISSION_EVENTS;
  return availableEvents[Math.floor(Math.random()*availableEvents.length)];
}
