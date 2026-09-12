const {
  mean,
  standardDeviation,
} = require("../utils/aiMath");

const getHour = (date) => new Date(date).getHours();

const getDayOfWeek = (date) => new Date(date).getDay();

const createEmptyBucket = ({
  key,
  date,
}) => ({
  key,
  date,
  hour: getHour(date),
  dayOfWeek: getDayOfWeek(date),
  totalRides: 0,
  requested: 0,
  accepted: 0,
  completed: 0,
  cancelled: 0,
  totalDistance: 0,
  totalDuration: 0,
});

const buildHourlyDemandFeatures = (
  rides,
  {
    fromDate,
    toDate,
  } = {},
) => {
  const buckets = new Map();

  for (const ride of rides) {
    const date = new Date(ride.createdAt);

    if (Number.isNaN(date.getTime())) continue;

    const key = [
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
    ].join("-");

    if (!buckets.has(key)) {
      buckets.set(
        key,
        createEmptyBucket({
          key,
          date,
        }),
      );
    }

    const bucket = buckets.get(key);

    bucket.totalRides += 1;

    if (ride.status === "REQUESTED") {
      bucket.requested += 1;
    }

    if (ride.status === "ACCEPTED") {
      bucket.accepted += 1;
    }

    if (ride.status === "COMPLETED") {
      bucket.completed += 1;
    }

    if (ride.status === "CANCELLED") {
      bucket.cancelled += 1;
    }

    bucket.totalDistance += Number(
      ride.distance || 0,
    );

    bucket.totalDuration += Number(
      ride.duration || 0,
    );
  }

  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start < end
    ) {
      const cursor = new Date(start);

      cursor.setMinutes(0, 0, 0);

      while (cursor < end) {
        const key = [
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
          cursor.getHours(),
        ].join("-");

        if (!buckets.has(key)) {
          buckets.set(
            key,
            createEmptyBucket({
              key,
              date: new Date(cursor),
            }),
          );
        }

        cursor.setHours(
          cursor.getHours() + 1,
        );
      }
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.date - b.date)
    .map((bucket) => ({
      ...bucket,

      averageDistance:
        bucket.totalRides > 0
          ? bucket.totalDistance /
            bucket.totalRides
          : 0,

      averageDuration:
        bucket.totalRides > 0
          ? bucket.totalDuration /
            bucket.totalRides
          : 0,

      cancellationRate:
        bucket.totalRides > 0
          ? bucket.cancelled /
            bucket.totalRides
          : 0,
    }));
};

const buildDemandProfile = (features) => {
  if (!Array.isArray(features) || !features.length) {
    return {
      hourly: {},
      weekday: {},
      statistics: {
        meanDemand: 0,
        demandStdDev: 0,
      },
    };
  }

  const hourly = {};
  const weekday = {};

  for (const feature of features) {
    if (!hourly[feature.hour]) {
      hourly[feature.hour] = [];
    }

    hourly[feature.hour].push(
      feature.totalRides,
    );

    if (!weekday[feature.dayOfWeek]) {
      weekday[feature.dayOfWeek] = [];
    }

    weekday[feature.dayOfWeek].push(
      feature.totalRides,
    );
  }

  const hourlyProfile = Object.fromEntries(
    Object.entries(hourly).map(
      ([hour, values]) => [
        hour,
        {
          averageDemand: mean(values),
          standardDeviation:
            standardDeviation(values),
          observations: values.length,
        },
      ],
    ),
  );

  const weekdayProfile = Object.fromEntries(
    Object.entries(weekday).map(
      ([day, values]) => [
        day,
        {
          averageDemand: mean(values),
          standardDeviation:
            standardDeviation(values),
          observations: values.length,
        },
      ],
    ),
  );

  const demandValues = features.map(
    (item) => item.totalRides,
  );

  return {
    hourly: hourlyProfile,
    weekday: weekdayProfile,
    statistics: {
      meanDemand: mean(demandValues),
      demandStdDev:
        standardDeviation(demandValues),
    },
  };
};

const buildDemandFeatures = (
  rides,
  options = {},
) => {
  const hourlyFeatures =
    buildHourlyDemandFeatures(
      rides,
      options,
    );

  return {
    observations: hourlyFeatures.length,
    features: hourlyFeatures,
    profile:
      buildDemandProfile(hourlyFeatures),
  };
};

module.exports = {
  buildHourlyDemandFeatures,
  buildDemandProfile,
  buildDemandFeatures,
};
