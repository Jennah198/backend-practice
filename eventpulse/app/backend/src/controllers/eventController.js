
const eventService = require("../services/eventService");

function parseInteger(value, fallback) {
  if (value === undefined) return fallback;

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

async function getEvents(req, res) {
  const limit = parseInteger(req.query.limit, 10);
  const offset = parseInteger(req.query.offset, 0);

  if (limit === null || limit < 1 || limit > 100) {
    return res.status(400).json({
      error: "limit must be an integer between 1 and 100",
    });
  }

  if (offset === null) {
    return res.status(400).json({
      error: "offset must be a non-negative integer",
    });
  }

  try {
    const events = await eventService.getEvents(limit, offset);

    res.json({
      data: events,
      pagination: {
        limit,
        offset,
        returned: events.length,
      },
    });
  } catch (error) {
    console.error("Failed to retrieve events:", error.message);

    res.status(500).json({
      error: "Failed to retrieve events",
    });
  }
}

async function createEvent(req, res) {
  const { user_id, event_name, country, metadata } = req.body || {};

  if (
    !Number.isSafeInteger(user_id) ||
    user_id <= 0 ||
    typeof event_name !== "string" ||
    event_name.trim().length === 0 ||
    event_name.length > 255
  ) {
    return res.status(400).json({
      error: "Valid user_id and event_name are required",
    });
  }

  if (
    country !== undefined &&
    country !== null &&
    (typeof country !== "string" || country.length > 100)
  ) {
    return res.status(400).json({
      error: "country must be a string of at most 100 characters",
    });
  }

  if (
    metadata !== undefined &&
    metadata !== null &&
    (typeof metadata !== "object" || Array.isArray(metadata))
  ) {
    return res.status(400).json({
      error: "metadata must be a JSON object",
    });
  }

  try {
    const event = await eventService.createEvent({
      user_id,
      event_name: event_name.trim(),
      country: country ?? null,
      metadata: metadata ?? null,
    });

    res.status(201).json({
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    console.error("Failed to create event:", error.message);

    res.status(500).json({
      error: "Failed to create event",
    });
  }
}

module.exports = {
  getEvents,
  createEvent,
};
