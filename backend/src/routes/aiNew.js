const router = require('express').Router();
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const db = require('../models');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

router.use(auth);

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

const persistAnalysis = async (analysisType, referenceId, referenceType, inputSummary, resultText, userId) => {
  try {
    await db.AiAnalysis.create({
      analysis_type: analysisType,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
      input_summary: inputSummary ? String(inputSummary).substring(0, 1000) : null,
      result_text: resultText,
      model_used: MODEL,
      user_id: userId || null,
    });
  } catch (e) {
    console.error('Failed to persist AI analysis:', e.message);
  }
};

// GET /api/ai-analyses - list AI analyses with pagination and filter by reference_type
router.get('/ai-analyses', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.reference_type) {
      where.reference_type = req.query.reference_type;
    }
    if (req.query.analysis_type) {
      where.analysis_type = req.query.analysis_type;
    }

    const { count, rows } = await db.AiAnalysis.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI analyses.', message: error.message });
  }
});

// POST /api/ai/after-action-report
// Accepts {incident_id}, fetches full timeline, generates FEMA AAR format report
router.post('/ai/after-action-report', aiRateLimiter, async (req, res) => {
  try {
    const { incident_id } = req.body;
    if (!incident_id) {
      return res.status(400).json({ error: 'incident_id is required.' });
    }

    const incident = await db.Incident.findByPk(incident_id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    // Fetch full incident timeline data
    const [communications, damageAssessments, resources, volunteers, searchRescueOps] = await Promise.all([
      db.Communication.findAll({ where: { incidentId: incident_id }, order: [['timestamp', 'ASC']] }),
      db.DamageAssessment.findAll({ where: { incidentId: incident_id }, order: [['createdAt', 'ASC']] }),
      db.Resource.findAll({ where: { assignedIncidentId: incident_id } }),
      db.Volunteer.findAll({ where: { assignedIncidentId: incident_id } }),
      db.SearchRescue.findAll({ where: { incidentId: incident_id }, order: [['createdAt', 'ASC']] }),
    ]);

    const systemPrompt = `You are an expert after-action report writer for emergency management agencies. Generate a comprehensive after-action report following FEMA AAR/IP format. Your response must be in JSON format with:
- executiveSummary: concise overview of the incident and response
- incidentOverview: detailed incident description with timeline
- responseActions: chronological account of response activities
- resourceUtilization: analysis of resource deployment and effectiveness
- strengths: array of what went well during the response
- areasForImprovement: array of identified areas needing improvement
- recommendations: array of specific, actionable recommendations
- correctiveActionPlan: detailed improvement plan with timelines and responsible parties
- financialSummary: cost breakdown of the response
- appendices: list of supporting documents needed`;

    const userMessage = `Generate a FEMA After-Action Report for:
Incident: ${incident.title}
Type: ${incident.type}
Severity: ${incident.severity}/5
Location: ${incident.location}
Status: ${incident.status}
Start Date: ${incident.startDate || 'Unknown'}
End Date: ${incident.endDate || 'Ongoing'}
Affected Population: ${incident.affectedPopulation || 'Unknown'}
Estimated Damage: ${incident.estimatedDamage ? '$' + incident.estimatedDamage.toLocaleString() : 'Unknown'}
Description: ${incident.description || 'N/A'}
Commander: ${incident.commanderName || 'N/A'}

Communications (${communications.length} total):
${communications.slice(0, 10).map(c => `- [${c.timestamp}] ${c.type} (${c.priority}): ${c.subject}`).join('\n')}

Damage Assessments (${damageAssessments.length} total):
${JSON.stringify(damageAssessments.slice(0, 5))}

Resources Deployed (${resources.length} total):
${resources.map(r => `- ${r.name} (${r.type}, qty: ${r.quantity})`).join('\n')}

Volunteers (${volunteers.length} total):
${volunteers.map(v => `- ${v.name}, hours: ${v.hoursLogged || 0}`).join('\n')}

Search & Rescue Operations (${searchRescueOps.length} total):
${JSON.stringify(searchRescueOps.slice(0, 5))}`;

    const result = await callOpenRouter(systemPrompt, userMessage);

    // Persist asynchronously
    persistAnalysis('after-action-report', incident_id, 'incident', `AAR for incident ${incident_id}`, result, req.user?.id);

    res.json({
      incident_id,
      incident_title: incident.title,
      report: result,
    });
  } catch (error) {
    res.status(500).json({ error: 'After-action report generation failed.', message: error.message });
  }
});

// POST /api/ai/resource-match
// Accepts {incident_id, resource_type, quantity}, queries surplus resources, AI ranks best matches
router.post('/ai/resource-match', aiRateLimiter, async (req, res) => {
  try {
    const { incident_id, resource_type, quantity } = req.body;
    if (!incident_id) {
      return res.status(400).json({ error: 'incident_id is required.' });
    }
    if (!resource_type) {
      return res.status(400).json({ error: 'resource_type is required.' });
    }
    if (!quantity || isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'quantity must be a positive number.' });
    }

    const targetIncident = await db.Incident.findByPk(incident_id);
    if (!targetIncident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    // Find available surplus resources of the requested type
    const availableResources = await db.Resource.findAll({
      where: {
        type: resource_type,
        status: 'available',
      },
      order: [['quantity', 'DESC']],
    });

    if (availableResources.length === 0) {
      return res.json({
        incident_id,
        resource_type,
        quantity_needed: quantity,
        matches: [],
        ai_recommendation: 'No available resources of this type found. Consider mutual aid requests.',
      });
    }

    const systemPrompt = `You are an expert emergency resource logistics coordinator. Analyze available resources and rank the best matches for a requesting incident. Return ONLY valid JSON with this structure:
{
  "rankedMatches": [
    {
      "resourceId": number,
      "resourceName": "string",
      "matchScore": 0.0-1.0,
      "reasoning": "why this is a good match",
      "deploymentEstimate": "time estimate to deploy",
      "quantityAvailable": number
    }
  ],
  "logisticsNotes": "overall logistics considerations",
  "mutualAidRecommended": true/false,
  "mutualAidJurisdictions": ["list if mutual aid is recommended"]
}`;

    const userMessage = `Rank these available resources for a disaster incident:

Requesting Incident:
- Title: ${targetIncident.title}
- Type: ${targetIncident.type}
- Severity: ${targetIncident.severity}/5
- Location: ${targetIncident.location}
- Resource Needed: ${quantity}x ${resource_type}

Available Resources:
${availableResources.map(r => JSON.stringify({
  id: r.id,
  name: r.name,
  type: r.type,
  quantity: r.quantity,
  location: r.location,
  condition: r.condition,
  status: r.status,
})).join('\n')}`;

    const result = await callOpenRouter(systemPrompt, userMessage);

    // Persist asynchronously
    persistAnalysis('resource-match', incident_id, 'incident', `${quantity}x ${resource_type} for incident ${incident_id}`, result, req.user?.id);

    let parsed = null;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : JSON.parse(result);
    } catch (e) {
      // return raw if parse fails
    }

    res.json({
      incident_id,
      resource_type,
      quantity_needed: quantity,
      available_count: availableResources.length,
      recommendation: parsed || { raw: result },
    });
  } catch (error) {
    res.status(500).json({ error: 'Resource matching failed.', message: error.message });
  }
});

// POST /api/ai/volunteer-deployment
// Accepts {incident_id, skills_needed[]}, fetches available volunteers, creates optimal deployment assignments
router.post('/ai/volunteer-deployment', aiRateLimiter, async (req, res) => {
  try {
    const { incident_id, skills_needed } = req.body;
    if (!incident_id) {
      return res.status(400).json({ error: 'incident_id is required.' });
    }
    if (!Array.isArray(skills_needed) || skills_needed.length === 0) {
      return res.status(400).json({ error: 'skills_needed must be a non-empty array.' });
    }

    const incident = await db.Incident.findByPk(incident_id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    // Fetch all available volunteers
    const availableVolunteers = await db.Volunteer.findAll({
      where: { availability: 'available' },
      order: [['hoursLogged', 'ASC']], // prioritize less-utilized volunteers
    });

    if (availableVolunteers.length === 0) {
      return res.json({
        incident_id,
        skills_needed,
        deployed_count: 0,
        assignments: [],
        message: 'No available volunteers found.',
      });
    }

    const systemPrompt = `You are an expert volunteer coordination specialist for disaster response. Create optimal volunteer deployment assignments based on skills needed and volunteer capabilities. Return ONLY valid JSON with this structure:
{
  "assignments": [
    {
      "volunteerId": number,
      "volunteerName": "string",
      "assignedRole": "string",
      "matchedSkills": ["skill1", "skill2"],
      "priorityRank": number,
      "deploymentNotes": "any special notes"
    }
  ],
  "skillGaps": ["skills not covered by available volunteers"],
  "deploymentStrategy": "overall strategy description",
  "estimatedCoverage": 0.0-1.0,
  "additionalRecruitmentNeeds": "description of additional volunteers needed if any"
}`;

    const userMessage = `Create volunteer deployment assignments for:

Incident: ${incident.title}
Type: ${incident.type}
Severity: ${incident.severity}/5
Location: ${incident.location}
Skills Needed: ${JSON.stringify(skills_needed)}

Available Volunteers (${availableVolunteers.length}):
${availableVolunteers.map(v => JSON.stringify({
  id: v.id,
  name: v.name,
  skills: v.skills,
  certifications: v.certifications,
  hoursLogged: v.hoursLogged,
  location: v.location,
})).join('\n')}`;

    const result = await callOpenRouter(systemPrompt, userMessage);

    // Parse response
    let parsed = null;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : JSON.parse(result);
    } catch (e) {
      // return raw if parse fails
    }

    // If we have parsed assignments, update volunteer availability
    if (parsed && Array.isArray(parsed.assignments) && parsed.assignments.length > 0) {
      const deployedIds = parsed.assignments.map(a => a.volunteerId).filter(Boolean);
      if (deployedIds.length > 0) {
        await db.Volunteer.update(
          { availability: 'deployed', assignedIncidentId: incident_id },
          { where: { id: deployedIds } }
        );
      }
    }

    // Persist asynchronously
    persistAnalysis(
      'volunteer-deployment',
      incident_id,
      'incident',
      `Skills needed: ${skills_needed.join(', ')} for incident ${incident_id}`,
      result,
      req.user?.id
    );

    res.json({
      incident_id,
      skills_needed,
      available_volunteers_count: availableVolunteers.length,
      deployment_plan: parsed || { raw: result },
    });
  } catch (error) {
    res.status(500).json({ error: 'Volunteer deployment planning failed.', message: error.message });
  }
});

// Helper: 503 if no API key configured (used by Apply pass 4 endpoints)
const requireKey = (res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ error: 'AI service not configured', message: 'OPENROUTER_API_KEY is not set' });
    return false;
  }
  return true;
};

// POST /ai/optimize-supply-distribution
// Audit recommendation: stateless supply-distribution optimizer.
// Body: { supplies: [{name, qty, location?}], demand_points: [{location, needs:[{item, qty}]}], constraints? }
router.post('/ai/optimize-supply-distribution', aiRateLimiter, async (req, res) => {
  try {
    const { supplies, demand_points, constraints } = req.body;
    if (!Array.isArray(supplies) || supplies.length === 0) {
      return res.status(400).json({ error: 'supplies (non-empty array) is required' });
    }
    if (!Array.isArray(demand_points) || demand_points.length === 0) {
      return res.status(400).json({ error: 'demand_points (non-empty array) is required' });
    }

    const systemPrompt = 'You are a humanitarian-logistics optimizer. Given current supplies and demand points, recommend an allocation plan that minimizes shortages, prioritizes urgent needs, and respects stated constraints. Return JSON only with shape: {"allocations":[{"from":"","to":"","item":"","qty":0,"priority":"high|medium|low"}],"unmet_demand":[{"location":"","item":"","qty":0}],"notes":""}';
    const userMessage = `Optimize the following supply distribution.

SUPPLIES:
${JSON.stringify(supplies, null, 2)}

DEMAND POINTS:
${JSON.stringify(demand_points, null, 2)}

CONSTRAINTS:
${constraints ? JSON.stringify(constraints, null, 2) : 'None provided'}

Return JSON only.`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ plan: result });
  } catch (error) {
    res.status(500).json({ error: 'Supply distribution optimization failed.', message: error.message });
  }
});

// POST /ai/match-donation-to-need
// Audit recommendation: stateless donation-to-need matcher.
// Body: { donations: [{item, qty, donor?, location?}], needs: [{location, item, qty, urgency}] }
router.post('/ai/match-donation-to-need', aiRateLimiter, async (req, res) => {
  try {
    const { donations, needs } = req.body;
    if (!Array.isArray(donations) || donations.length === 0) {
      return res.status(400).json({ error: 'donations (non-empty array) is required' });
    }
    if (!Array.isArray(needs) || needs.length === 0) {
      return res.status(400).json({ error: 'needs (non-empty array) is required' });
    }

    const systemPrompt = 'You are a donation-coordination AI. Match donated items to verified needs to maximize utility, minimize spoilage and transport, and respect urgency. Return JSON only: {"matches":[{"donation_id":"","need_id":"","item":"","qty":0,"why":""}],"surplus_donations":[],"unmet_needs":[]}';
    const userMessage = `Match donations to needs.

DONATIONS:
${JSON.stringify(donations, null, 2)}

NEEDS:
${JSON.stringify(needs, null, 2)}

Return JSON only.`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ matches: result });
  } catch (error) {
    res.status(500).json({ error: 'Donation matching failed.', message: error.message });
  }
});

// POST /ai/optimize-shelter-assignments
// Audit recommendation: stateless shelter-assignment optimizer.
// Body: { shelters: [{id, capacity, accessible?, family_friendly?, pets_ok?}], evacuees: [{group_id, size, special_needs?}] }
router.post('/ai/optimize-shelter-assignments', aiRateLimiter, async (req, res) => {
  try {
    const { shelters, evacuees } = req.body;
    if (!Array.isArray(shelters) || shelters.length === 0) {
      return res.status(400).json({ error: 'shelters (non-empty array) is required' });
    }
    if (!Array.isArray(evacuees) || evacuees.length === 0) {
      return res.status(400).json({ error: 'evacuees (non-empty array) is required' });
    }

    const systemPrompt = 'You are a shelter-assignment optimizer for disaster response. Assign each evacuee group to the best shelter, respecting capacity, accessibility, family-keep-together, pets, and special needs. Return JSON only: {"assignments":[{"evacuee_group_id":"","shelter_id":"","reason":""}],"unassigned":[{"evacuee_group_id":"","reason":""}],"shelter_load":[{"shelter_id":"","used":0,"capacity":0}]}';
    const userMessage = `Assign evacuees to shelters.

SHELTERS:
${JSON.stringify(shelters, null, 2)}

EVACUEES:
${JSON.stringify(evacuees, null, 2)}

Return JSON only.`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ assignments: result });
  } catch (error) {
    res.status(500).json({ error: 'Shelter assignment failed.', message: error.message });
  }
});

// ============================================================
// Apply pass 4 (mechanical backlog) — three new stateless AI endpoints
// Each returns 503 when OPENROUTER_API_KEY is unset.
// ============================================================

// POST /ai/vulnerability-analysis
// Body: { population: [{group, count, factors?[]}], hazard?, location? }
router.post('/ai/vulnerability-analysis', aiRateLimiter, async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const { population, hazard, location } = req.body || {};
    if (!Array.isArray(population) || population.length === 0) {
      return res.status(400).json({ error: 'population (non-empty array) is required' });
    }

    const systemPrompt = 'You are an emergency-management vulnerability analyst. Identify which population groups are most at risk given the hazard and local context, ranking by vulnerability score with specific protective actions. Return JSON only with shape: {"rankings":[{"group":"","vulnerability_score":0.0,"top_factors":[],"protective_actions":[]}],"high_priority_groups":[],"notes":""}';
    const userMessage = `Analyze population vulnerability.\n\nPOPULATION:\n${JSON.stringify(population, null, 2)}\n\nHAZARD: ${hazard || 'unspecified'}\nLOCATION: ${location || 'unspecified'}\n\nReturn JSON only.`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ analysis: result });
  } catch (error) {
    res.status(500).json({ error: 'Vulnerability analysis failed.', message: error.message });
  }
});

// POST /ai/recovery-trajectory
// Body: { incident_summary, current_status, resources_available, milestones?[] }
router.post('/ai/recovery-trajectory', aiRateLimiter, async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const { incident_summary, current_status, resources_available, milestones } = req.body || {};
    if (!incident_summary || !current_status) {
      return res.status(400).json({ error: 'incident_summary and current_status are required' });
    }

    const systemPrompt = 'You are a disaster-recovery analyst. Project a recovery trajectory with realistic phase durations, dependencies, and risks. Return JSON only with shape: {"phases":[{"name":"","est_duration_days":0,"dependencies":[],"key_activities":[]}],"total_est_recovery_days":0,"risks":[],"recommendations":[]}';
    const userMessage = `Project the recovery trajectory.\n\nINCIDENT SUMMARY:\n${incident_summary}\n\nCURRENT STATUS:\n${typeof current_status === 'string' ? current_status : JSON.stringify(current_status, null, 2)}\n\nRESOURCES AVAILABLE:\n${resources_available ? JSON.stringify(resources_available, null, 2) : 'unspecified'}\n\nMILESTONES:\n${Array.isArray(milestones) && milestones.length ? JSON.stringify(milestones, null, 2) : 'none provided'}\n\nReturn JSON only.`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ trajectory: result });
  } catch (error) {
    res.status(500).json({ error: 'Recovery trajectory generation failed.', message: error.message });
  }
});

// POST /ai/impact-forecast
// Body: { hazard, region, population_at_risk?, time_horizon_hours? }
router.post('/ai/impact-forecast', aiRateLimiter, async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const { hazard, region, population_at_risk, time_horizon_hours } = req.body || {};
    if (!hazard || !region) {
      return res.status(400).json({ error: 'hazard and region are required' });
    }

    const systemPrompt = 'You are a pre-event impact forecaster for emergency managers. Forecast likely impacts (casualties, displacement, infrastructure, economic), with confidence ranges. Return JSON only with shape: {"forecast":{"casualties_range":[0,0],"displacement_range":[0,0],"infrastructure_impact":"","economic_impact_usd_range":[0,0]},"confidence":"low|medium|high","key_assumptions":[],"recommended_preparations":[]}';
    const userMessage = `Forecast pre-event impact.\n\nHAZARD: ${hazard}\nREGION: ${region}\nPOPULATION AT RISK: ${population_at_risk || 'unspecified'}\nTIME HORIZON HOURS: ${time_horizon_hours || 'unspecified'}\n\nReturn JSON only.`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ forecast: result });
  } catch (error) {
    res.status(500).json({ error: 'Impact forecast failed.', message: error.message });
  }
});

// ============================================================
// Apply pass 5 — remaining backlog
// ============================================================

// NEEDS-CREDS: social-media crisis monitoring.
// Env vars required: TWITTER_BEARER_TOKEN (Twitter v2 API).
// Currently the endpoint short-circuits with 503 if creds are absent and
// otherwise hands the (caller-provided) sample text to the LLM for triage.
// The actual Twitter ingestion is NOT performed here — wiring the real API
// requires an SDK install which the apply-pass policy disallows.
// POST /ai/social-media-monitoring
// Body: { keywords:[], sample_posts?:[{text,location?,timestamp?}], region? }
router.post('/ai/social-media-monitoring', aiRateLimiter, async (req, res) => {
  if (!process.env.TWITTER_BEARER_TOKEN) {
    return res.status(503).json({
      error: 'Social-media monitoring not configured',
      missing: 'TWITTER_BEARER_TOKEN',
    });
  }
  if (!requireKey(res)) return;
  try {
    const { keywords, sample_posts, region } = req.body || {};
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords (non-empty array) is required' });
    }
    const systemPrompt = 'You are a crisis-information analyst. Triage social-media posts for situational awareness — extract verified-looking signals (locations, casualties, urgent needs), flag misinformation, and surface trends. Return JSON only with shape: {"signals":[{"text":"","location":"","category":"need|hazard|update|misinfo","urgency":"low|medium|high"}],"trends":[],"misinformation_flags":[],"summary":""}';
    const userMessage = `Triage social-media posts.\n\nKEYWORDS: ${JSON.stringify(keywords)}\nREGION: ${region || 'unspecified'}\nSAMPLE POSTS:\n${Array.isArray(sample_posts) && sample_posts.length ? JSON.stringify(sample_posts, null, 2) : 'none provided (would normally be fetched live from Twitter)'}\n\nReturn JSON only.`;
    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ analysis: result });
  } catch (error) {
    res.status(500).json({ error: 'Social-media monitoring failed.', message: error.message });
  }
});

// NEEDS-CREDS: emergency-services SOAR dispatch (911/FEMA/RedCross integration stub).
// Env vars required: EMERGENCY_DISPATCH_URL, EMERGENCY_DISPATCH_TOKEN.
// Returns 503 + missing if absent. When present, the LLM produces a structured
// dispatch packet that the caller can forward to the integration of choice;
// no outbound HTTP is made from this endpoint (additive only).
// POST /ai/emergency-dispatch-packet
// Body: { incident_id, channel:"911"|"FEMA"|"RedCross", priority? }
router.post('/ai/emergency-dispatch-packet', aiRateLimiter, async (req, res) => {
  const missing = [];
  if (!process.env.EMERGENCY_DISPATCH_URL) missing.push('EMERGENCY_DISPATCH_URL');
  if (!process.env.EMERGENCY_DISPATCH_TOKEN) missing.push('EMERGENCY_DISPATCH_TOKEN');
  if (missing.length) {
    return res.status(503).json({
      error: 'Emergency dispatch integration not configured',
      missing: missing.join(','),
    });
  }
  if (!requireKey(res)) return;
  try {
    const { incident_id, channel, priority } = req.body || {};
    if (!incident_id || !channel) {
      return res.status(400).json({ error: 'incident_id and channel are required' });
    }
    const incident = await db.Incident.findByPk(incident_id);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });
    const systemPrompt = 'You are an emergency-services liaison. Produce a structured dispatch packet ready for the requested channel (911 CAD, FEMA RAVS, Red Cross). Return JSON only with shape: {"channel":"","priority":"","summary":"","location":{"lat":0,"lng":0,"address":""},"resources_requested":[],"contacts":[],"safety_notes":[]}';
    const userMessage = `Create dispatch packet.\n\nCHANNEL: ${channel}\nPRIORITY: ${priority || 'auto'}\nINCIDENT:\n${JSON.stringify(incident.toJSON ? incident.toJSON() : incident, null, 2)}\n\nReturn JSON only.`;
    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ packet: result });
  } catch (error) {
    res.status(500).json({ error: 'Dispatch packet generation failed.', message: error.message });
  }
});

// PRODUCT-DECISION: Live command-center dashboard architecture is unspecified.
// Default chosen: a synchronous summary endpoint that aggregates current
// incidents + resource counts + active SAR ops and asks the LLM to surface
// the top operational priorities. A WebSocket-driven feed would be a follow-on.
// POST /ai/command-center-summary
// Body: { incident_ids?:[], time_window_hours? }
router.post('/ai/command-center-summary', aiRateLimiter, async (req, res) => {
  if (!requireKey(res)) return;
  try {
    const { incident_ids, time_window_hours } = req.body || {};
    const where = Array.isArray(incident_ids) && incident_ids.length
      ? { id: incident_ids }
      : {};
    const [incidents, resources, sarOps] = await Promise.all([
      db.Incident.findAll({ where, order: [['createdAt', 'DESC']], limit: 50 }),
      db.Resource.findAll({ limit: 200 }),
      db.SearchRescue.findAll({ order: [['createdAt', 'DESC']], limit: 50 }),
    ]);
    const systemPrompt = 'You are an emergency-operations watch officer. Produce a concise command-center situation report listing the top operational priorities, resource gaps, and decision points. Return JSON only with shape: {"top_priorities":[],"resource_gaps":[],"decision_points":[],"executive_summary":""}';
    const userMessage = `Build command-center summary.\n\nTIME WINDOW HOURS: ${time_window_hours || 'unspecified'}\nINCIDENTS (count=${incidents.length}):\n${JSON.stringify(incidents.slice(0, 10).map(i => i.toJSON ? i.toJSON() : i), null, 2)}\nRESOURCES (count=${resources.length})\nSAR OPS (count=${sarOps.length})\n\nReturn JSON only.`;
    const result = await callOpenRouter(systemPrompt, userMessage);
    res.json({ summary: result });
  } catch (error) {
    res.status(500).json({ error: 'Command-center summary failed.', message: error.message });
  }
});

module.exports = router;
