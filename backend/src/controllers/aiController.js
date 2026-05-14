const fetch = require('node-fetch');
const db = require('../models');
const { parseAIJson } = require('../utils/parseAIJson');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

const callOpenRouter = async (systemPrompt, userMessage) => {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'OpenRouter API error');
  }

  return data.choices[0].message.content;
};

const persistAnalysis = async (analysisType, referenceId, referenceType, inputSummary, resultText, userId, parsed = null) => {
  try {
    await db.AiAnalysis.create({
      analysis_type: analysisType,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
      input_summary: inputSummary ? String(inputSummary).substring(0, 1000) : null,
      result_text: resultText,
      ai_results: parsed || null,
      model_used: MODEL,
      user_id: userId || null,
    });
  } catch (e) {
    console.error('Failed to persist AI analysis:', e.message);
  }
};

const runAndRespond = async (req, res, { analysisType, referenceType, referenceId, inputSummary, systemPrompt, userMessage, responseKey }) => {
  try {
    const result = await callOpenRouter(systemPrompt, userMessage);
    const { parsed } = parseAIJson(result);
    await persistAnalysis(analysisType, referenceId || null, referenceType || null, inputSummary, result, req.user?.id, parsed);
    const payload = { [responseKey]: parsed || result };
    if (parsed) payload.parsed = true;
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: `${analysisType} failed.`, message: error.message });
  }
};

const analyzeThreat = async (req, res) => {
  const { threatType, region, description, historicalData } = req.body;
  const systemPrompt = `You are an expert disaster threat analyst for emergency management. Analyze the given threat and provide a comprehensive risk assessment. Your response must be in JSON format with the following fields:
- riskLevel: "low", "moderate", "high", or "extreme"
- probability: a number between 0 and 1
- potentialImpact: detailed description of potential impact
- affectedPopulation: estimated number of people affected
- immediateActions: array of immediate actions to take
- mitigationSteps: array of mitigation strategies
- timeframe: expected timeframe for the threat
- confidence: your confidence level as a number between 0 and 1
Provide evidence-based analysis using disaster response best practices.`;
  const userMessage = `Analyze this disaster threat:
Type: ${threatType}
Region: ${region}
Description: ${description}
Historical Data: ${historicalData || 'None provided'}`;

  return runAndRespond(req, res, {
    analysisType: 'threat-analysis',
    referenceType: 'threat',
    inputSummary: `${threatType} in ${region}`,
    systemPrompt,
    userMessage,
    responseKey: 'analysis',
  });
};

const generateEvacuationPlan = async (req, res) => {
  const { area, population, hazardType, availableRoutes, shelterCapacity, specialNeeds } = req.body;
  const systemPrompt = `You are an expert evacuation planner for emergency management agencies. Generate a detailed, actionable evacuation plan. Your response must be in JSON format with:
- phases: array of evacuation phases with timing
- routes: prioritized evacuation routes with capacity estimates
- shelterAssignments: mapping of zones to designated shelters
- transportationPlan: vehicles and transport modes needed
- specialNeedsAccommodations: plans for elderly, disabled, medical patients
- communicationPlan: how to notify and guide evacuees
- timeline: hour-by-hour timeline
- trafficManagement: traffic control points and flow directions
- estimatedCompletionTime: total time to complete evacuation
- contingencyPlans: backup plans if primary routes fail`;
  const userMessage = `Generate an evacuation plan for:
Area: ${area}
Population: ${population}
Hazard Type: ${hazardType}
Available Routes: ${JSON.stringify(availableRoutes || [])}
Shelter Capacity: ${shelterCapacity || 'Unknown'}
Special Needs Population: ${JSON.stringify(specialNeeds || {})}`;

  return runAndRespond(req, res, {
    analysisType: 'evacuation-plan',
    referenceType: 'evacuation',
    inputSummary: `${area} - ${hazardType}`,
    systemPrompt,
    userMessage,
    responseKey: 'evacuationPlan',
  });
};

const assessDamage = async (req, res) => {
  const { location, disasterType, description, structureTypes, reportedInjuries } = req.body;
  const systemPrompt = `You are an expert structural and infrastructure damage assessor for FEMA-level disaster response. Analyze the described damage and provide a comprehensive assessment. Your response must be in JSON format with:
- overallDamageLevel: "minor", "moderate", "severe", or "catastrophic"
- structuralAssessment: detailed structural damage analysis
- infrastructureAssessment: roads, utilities, communications status
- estimatedRepairCost: dollar amount estimate
- safetyHazards: array of identified safety hazards
- immediateActions: urgent actions required
- rebuildingPriority: prioritized list of what to repair first
- displacedPopulationEstimate: number of people displaced
- environmentalConcerns: environmental risks from the damage
- timeToRecovery: estimated recovery timeline`;
  const userMessage = `Assess damage for:
Location: ${location}
Disaster Type: ${disasterType}
Description: ${description}
Structure Types: ${JSON.stringify(structureTypes || [])}
Reported Injuries: ${reportedInjuries || 'Unknown'}`;

  return runAndRespond(req, res, {
    analysisType: 'damage-assessment',
    referenceType: 'damage',
    inputSummary: `${disasterType} at ${location}`,
    systemPrompt,
    userMessage,
    responseKey: 'damageAssessment',
  });
};

const predictWeather = async (req, res) => {
  const { region, currentConditions, forecastData, disasterContext } = req.body;
  const systemPrompt = `You are an expert meteorologist specializing in disaster-related weather prediction. Analyze the weather conditions and predict their impact on disaster response operations. Your response must be in JSON format with:
- weatherForecast: detailed weather prediction for next 72 hours
- impactAssessment: how weather will affect disaster response
- riskFactors: weather-related risks to responders and evacuees
- operationalWindows: best time windows for operations
- warnings: critical weather warnings
- recommendations: actionable recommendations for incident commanders
- equipmentConsiderations: equipment adjustments needed
- safetyProtocols: weather-specific safety measures`;
  const userMessage = `Predict weather impact for:
Region: ${region}
Current Conditions: ${JSON.stringify(currentConditions || {})}
Forecast Data: ${JSON.stringify(forecastData || {})}
Disaster Context: ${disasterContext || 'General disaster response'}`;

  return runAndRespond(req, res, {
    analysisType: 'weather-prediction',
    referenceType: 'weather',
    inputSummary: `Region: ${region}`,
    systemPrompt,
    userMessage,
    responseKey: 'weatherPrediction',
  });
};

const optimizeResources = async (req, res) => {
  const { availableResources, activeIncidents, priorities, constraints } = req.body;
  const systemPrompt = `You are an expert resource allocation optimizer for multi-agency disaster response coordination. Optimize resource distribution across active incidents. Your response must be in JSON format with:
- allocations: array of resource-to-incident assignments with quantities
- justification: reasoning for each allocation decision
- gaps: identified resource gaps that need procurement
- mutualAidRequests: recommended mutual aid requests to neighboring jurisdictions
- priorityRanking: ranked list of incidents by resource priority
- logisticsplan: transportation and staging recommendations
- costEstimate: estimated cost of the allocation plan
- alternativeScenarios: 2-3 alternative allocation strategies
- efficiencyScore: estimated efficiency of the proposed plan (0-100)`;
  const userMessage = `Optimize resource allocation:
Available Resources: ${JSON.stringify(availableResources || [])}
Active Incidents: ${JSON.stringify(activeIncidents || [])}
Priorities: ${JSON.stringify(priorities || [])}
Constraints: ${JSON.stringify(constraints || {})}`;

  return runAndRespond(req, res, {
    analysisType: 'resource-optimization',
    referenceType: 'resource',
    inputSummary: 'Cross-incident resource optimization',
    systemPrompt,
    userMessage,
    responseKey: 'resourceOptimization',
  });
};

const generateReport = async (req, res) => {
  const { incidentDetails, timeline, resourcesUsed, outcomes, lessonsLearned } = req.body;
  const systemPrompt = `You are an expert after-action report writer for emergency management agencies. Generate a comprehensive after-action report following FEMA AAR/IP format. Your response must be in JSON format with:
- executiveSummary: concise overview of the incident and response
- incidentOverview: detailed incident description with timeline
- responseActions: chronological account of response activities
- resourceUtilization: analysis of resource deployment and effectiveness
- strengths: what went well during the response
- areasForImprovement: identified areas needing improvement
- recommendations: specific, actionable recommendations
- corrativeActionPlan: detailed improvement plan with timelines and responsible parties
- financialSummary: cost breakdown of the response
- appendices: list of supporting documents needed`;
  const userMessage = `Generate an after-action report for:
Incident Details: ${JSON.stringify(incidentDetails || {})}
Timeline: ${JSON.stringify(timeline || [])}
Resources Used: ${JSON.stringify(resourcesUsed || [])}
Outcomes: ${JSON.stringify(outcomes || {})}
Lessons Learned: ${JSON.stringify(lessonsLearned || [])}`;

  return runAndRespond(req, res, {
    analysisType: 'after-action-report',
    referenceType: 'report',
    inputSummary: 'After-action report (general)',
    systemPrompt,
    userMessage,
    responseKey: 'report',
  });
};

const triageMedical = async (req, res) => {
  const { casualties, availableMedical, disasterType, conditions } = req.body;
  const systemPrompt = `You are an expert emergency medical triage specialist for mass casualty incidents. Provide triage recommendations following START (Simple Triage and Rapid Treatment) protocols. Your response must be in JSON format with:
- triageCategories: breakdown of casualties by category (immediate/delayed/minor/expectant)
- treatmentPriorities: ordered list of treatment priorities
- medicalResourceAllocation: how to distribute medical resources
- fieldHospitalSetup: recommendations for field medical stations
- transportPriorities: patient transport priority order
- specializedCareNeeds: patients requiring specialized treatment
- supplyRequirements: medical supplies needed with quantities
- staffingRecommendations: medical personnel deployment plan
- mentalHealthConsiderations: psychological first aid recommendations
- massDecontinationProtocol: if chemical/biological exposure is suspected`;
  const userMessage = `Provide medical triage recommendations for:
Estimated Casualties: ${JSON.stringify(casualties || {})}
Available Medical Resources: ${JSON.stringify(availableMedical || {})}
Disaster Type: ${disasterType || 'Unknown'}
Current Conditions: ${JSON.stringify(conditions || {})}`;

  return runAndRespond(req, res, {
    analysisType: 'medical-triage',
    referenceType: 'medical',
    inputSummary: `${disasterType || 'Unknown'} triage`,
    systemPrompt,
    userMessage,
    responseKey: 'triageRecommendation',
  });
};

const searchStrategy = async (req, res) => {
  const { searchArea, missingPersons, terrain, conditions, availableTeams } = req.body;
  const systemPrompt = `You are an expert search and rescue strategist with decades of experience in urban and wilderness SAR operations. Develop a comprehensive search strategy. Your response must be in JSON format with:
- searchPattern: recommended search pattern (grid, spiral, contour, etc.)
- sectorDivision: how to divide the search area into manageable sectors
- teamAssignments: which teams search which sectors
- priorityAreas: high-probability areas to search first based on lost person behavior
- equipmentDeployment: what equipment to deploy where
- timelinePhases: phased search timeline
- canineDeployment: K-9 unit deployment strategy
- aerialSearchPlan: drone/helicopter search patterns
- communicationProtocol: team communication plan
- safetyBriefing: hazards and safety protocols for search teams
- probabilityOfDetection: estimated POD for each sector
- suspensionCriteria: when to suspend or modify the search`;
  const userMessage = `Develop a search and rescue strategy for:
Search Area: ${JSON.stringify(searchArea || {})}
Missing Persons: ${JSON.stringify(missingPersons || {})}
Terrain: ${terrain || 'Unknown'}
Conditions: ${JSON.stringify(conditions || {})}
Available Teams: ${JSON.stringify(availableTeams || [])}`;

  return runAndRespond(req, res, {
    analysisType: 'search-strategy',
    referenceType: 'sar',
    inputSummary: `Terrain: ${terrain || 'Unknown'}`,
    systemPrompt,
    userMessage,
    responseKey: 'searchStrategy',
  });
};

module.exports = {
  analyzeThreat,
  generateEvacuationPlan,
  assessDamage,
  predictWeather,
  optimizeResources,
  generateReport,
  triageMedical,
  searchStrategy,
  callOpenRouter,
  persistAnalysis,
};
