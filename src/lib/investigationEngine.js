const DEFAULT_CLASSIFICATION = "unknown";

const ACCOUNT_HEADER_ALIASES = {
  s_no: "row_number",
  acknowledgement_no: "acknowledgement_number",
  account_no_wallet_pg_pa_id: "sender_account",
  bank_fis: "receiver_bank",
  layer: "layer",
  account_no: "receiver_account",
  ifsc_code: "receiver_ifsc",
  transaction_id_utr_number: "transaction_id",
  transaction_id_utr_number2: "reference_id",
  put_on_hold_date: "timestamp",
  put_on_hold_amount: "amount",
  withdrawal_date_time: "timestamp",
  withdrawal_amount: "amount",
  atm_id: "receiver_account",
  place_location_of_atm: "receiver_location",
  transaction_amount: "amount",
  disputed_amount: "disputed_amount",
  reference_no: "reference_id",
  action_taken_by_bank: "bank_action",
  date_of_action: "action_date",
  transaction_date: "timestamp",
  p_i_s_nodal: "pis_nodal",
  senderaccount: "sender_account",
  sender_account_number: "sender_account",
  fromaccount: "sender_account",
  from_account: "sender_account",
  debitaccount: "sender_account",
  sourceaccount: "sender_account",
  receiveraccount: "receiver_account",
  receiver_account_number: "receiver_account",
  toaccount: "receiver_account",
  to_account: "receiver_account",
  creditaccount: "receiver_account",
  destinationaccount: "receiver_account",
  amountinr: "amount",
  transactionamount: "amount",
  fraudamount: "amount",
  txnamount: "amount",
  transactiontime: "timestamp",
  transactiontimestamp: "timestamp",
  txn_timestamp: "timestamp",
  transactiondate: "timestamp",
  utr: "reference_id",
  referenceno: "reference_id",
  referencenumber: "reference_id",
  rrn: "reference_id",
  disputedamount: "disputed_amount",
  remarks: "flag_reason",
  actiontakenbybank: "bank_action",
  dateofaction: "action_date",
  pisnodal: "pis_nodal",
  mode: "transaction_type",
  channel: "transaction_type",
  status: "transaction_status",
  sendername: "sender_name",
  receivername: "receiver_name",
  senderbank: "sender_bank",
  receiverbank: "receiver_bank",
  senderdevice: "sender_device",
  receiverdevice: "receiver_device",
  senderip: "sender_ip",
  receiverip: "receiver_ip",
  senderlocation: "sender_location",
  receiverlocation: "receiver_location",
};

function normalizeHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value ?? "")
    .replace(/[₹,\s]/g, "")
    .trim();

  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function safeDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const nativeDate = new Date(text);
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  const [datePart, timePart = "", meridiemPart = ""] = text.replace(/\s+/g, " ").split(" ");
  const dateMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!dateMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const timeTokens = timePart.split(":").filter(Boolean);
  let hour = Number(timeTokens[0] || 0);
  const minute = Number(timeTokens[1] || 0);
  const second = Number(timeTokens[2] || 0);
  const meridiem = String(meridiemPart || timeTokens[3] || "").trim().toUpperCase();

  if (meridiem === "PM" && hour < 12) {
    hour += 12;
  } else if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  const parsedDate = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function safeIso(value, fallback = new Date().toISOString()) {
  const parsed = safeDate(value);
  return parsed ? parsed.toISOString() : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
  return `Rs ${Math.round(value || 0).toLocaleString()}`;
}

function hoursBetween(start, end) {
  if (!start || !end) {
    return 1;
  }

  return Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

function minutesBetween(start, end) {
  if (!start || !end) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(end.getTime() - start.getTime()) / (1000 * 60);
}

function buildEmptyAccount(accountNumber, seed = {}) {
  return {
    account_number: accountNumber,
    account_holder_name: seed.account_holder_name || seed.name || accountNumber,
    mobile_number: seed.mobile_number || "",
    email: seed.email || "",
    kyc_id_masked: seed.kyc_id_masked || "NA",
    bank_name: seed.bank_name || "Unknown Bank",
    account_creation_date: seed.account_creation_date || "2024-01-01",
    current_balance: Number.isFinite(seed.current_balance) ? seed.current_balance : 0,
    account_status: seed.account_status || "active",
    classification: seed.classification || DEFAULT_CLASSIFICATION,
    risk_score: seed.risk_score || 0,
    trust_score: seed.trust_score || 0,
    transaction_velocity: seed.transaction_velocity || 0,
    chain_depth_level: seed.chain_depth_level || 0,
    freeze_priority: seed.freeze_priority || 0,
    case_id: seed.case_id || "",
    ip_address: seed.ip_address || "",
    device_id: seed.device_id || "",
    location: seed.location || "Unknown",
    login_timestamp: seed.login_timestamp || null,
  };
}

function mergeAccountData(base, extra = {}) {
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(extra).filter(([, value]) => value !== undefined && value !== null && value !== "")
    ),
  };
}

function buildAccountMap(accounts = [], transactions = []) {
  const accountMap = new Map();

  accounts.forEach((account) => {
    accountMap.set(account.account_number, buildEmptyAccount(account.account_number, account));
  });

  transactions.forEach((transaction) => {
    const senderSeed = {
      account_holder_name: transaction.sender_name,
      bank_name: transaction.sender_bank,
      device_id: transaction.sender_device,
      ip_address: transaction.sender_ip,
      location: transaction.sender_location,
      login_timestamp: transaction.timestamp,
    };
    const receiverSeed = {
      account_holder_name: transaction.receiver_name,
      bank_name: transaction.receiver_bank,
      device_id: transaction.receiver_device,
      ip_address: transaction.receiver_ip,
      location: transaction.receiver_location,
      login_timestamp: transaction.timestamp,
    };

    if (!accountMap.has(transaction.sender_account)) {
      accountMap.set(transaction.sender_account, buildEmptyAccount(transaction.sender_account, senderSeed));
    } else {
      accountMap.set(
        transaction.sender_account,
        mergeAccountData(accountMap.get(transaction.sender_account), senderSeed)
      );
    }

    if (!accountMap.has(transaction.receiver_account)) {
      accountMap.set(transaction.receiver_account, buildEmptyAccount(transaction.receiver_account, receiverSeed));
    } else {
      accountMap.set(
        transaction.receiver_account,
        mergeAccountData(accountMap.get(transaction.receiver_account), receiverSeed)
      );
    }
  });

  return accountMap;
}

function buildTransactionStats(accountMap, transactions) {
  const statsMap = new Map();

  accountMap.forEach((account, accountNumber) => {
    statsMap.set(accountNumber, {
      incoming: [],
      outgoing: [],
      incomingTotal: 0,
      outgoingTotal: 0,
      senders: new Set(),
      receivers: new Set(),
      firstSeen: null,
      lastSeen: null,
      recentBurst: false,
      rapidSplit: false,
    });
  });

  transactions.forEach((transaction) => {
    const timestamp = safeDate(transaction.timestamp);
    const senderStats = statsMap.get(transaction.sender_account);
    const receiverStats = statsMap.get(transaction.receiver_account);

    if (senderStats) {
      senderStats.outgoing.push({ ...transaction, _timestamp: timestamp });
      senderStats.outgoingTotal += transaction.amount;
      senderStats.receivers.add(transaction.receiver_account);
      senderStats.firstSeen = !senderStats.firstSeen || (timestamp && timestamp < senderStats.firstSeen) ? timestamp : senderStats.firstSeen;
      senderStats.lastSeen = !senderStats.lastSeen || (timestamp && timestamp > senderStats.lastSeen) ? timestamp : senderStats.lastSeen;
    }

    if (receiverStats) {
      receiverStats.incoming.push({ ...transaction, _timestamp: timestamp });
      receiverStats.incomingTotal += transaction.amount;
      receiverStats.senders.add(transaction.sender_account);
      receiverStats.firstSeen = !receiverStats.firstSeen || (timestamp && timestamp < receiverStats.firstSeen) ? timestamp : receiverStats.firstSeen;
      receiverStats.lastSeen = !receiverStats.lastSeen || (timestamp && timestamp > receiverStats.lastSeen) ? timestamp : receiverStats.lastSeen;
    }
  });

  statsMap.forEach((stats) => {
    stats.incoming.sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
    stats.outgoing.sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

    const timeline = [...stats.incoming, ...stats.outgoing]
      .map((transaction) => transaction._timestamp)
      .filter(Boolean)
      .sort((left, right) => left - right);

    for (let index = 0; index < timeline.length; index += 1) {
      const start = timeline[index];
      let count = 1;

      for (let cursor = index + 1; cursor < timeline.length; cursor += 1) {
        if (minutesBetween(start, timeline[cursor]) <= 10) {
          count += 1;
        }
      }

      if (count >= 3) {
        stats.recentBurst = true;
        break;
      }
    }

    stats.incoming.forEach((incomingTransaction) => {
      const matchingOutgoing = stats.outgoing.filter(
        (outgoingTransaction) =>
          outgoingTransaction._timestamp &&
          incomingTransaction._timestamp &&
          outgoingTransaction._timestamp >= incomingTransaction._timestamp &&
          minutesBetween(outgoingTransaction._timestamp, incomingTransaction._timestamp) <= 15
      );

      if (matchingOutgoing.length >= 2) {
        stats.rapidSplit = true;
      }
    });
  });

  return statsMap;
}

function computeChainDepths(caseData, transactions) {
  const victimAccount = caseData.victim_account || transactions[0]?.sender_account || null;
  const adjacency = new Map();

  transactions.forEach((transaction) => {
    if (!adjacency.has(transaction.sender_account)) {
      adjacency.set(transaction.sender_account, []);
    }
    adjacency.get(transaction.sender_account).push(transaction.receiver_account);
  });

  const depths = new Map();
  if (!victimAccount) {
    return { depths, victimAccount };
  }

  depths.set(victimAccount, 0);
  const queue = [victimAccount];

  while (queue.length) {
    const current = queue.shift();
    const currentDepth = depths.get(current);
    const neighbors = adjacency.get(current) || [];

    neighbors.forEach((neighbor) => {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    });
  }

  return { depths, victimAccount };
}

function computeTaintedBalances(caseData, transactions) {
  const tainted = new Map();
  const victimAccount = caseData.victim_account || transactions[0]?.sender_account;

  transactions.forEach((transaction) => {
    const senderBalance = tainted.get(transaction.sender_account) || 0;
    const senderStartsTaint = transaction.sender_account === victimAccount;
    const transferable = senderStartsTaint ? transaction.amount : Math.min(transaction.amount, senderBalance);

    if (transferable <= 0) {
      return;
    }

    if (!senderStartsTaint) {
      tainted.set(transaction.sender_account, Math.max(0, senderBalance - transferable));
    }

    tainted.set(transaction.receiver_account, (tainted.get(transaction.receiver_account) || 0) + transferable);
  });

  return tainted;
}

function buildTransactionPaths(caseData, transactions) {
  const victimAccount = caseData.victim_account || transactions[0]?.sender_account;
  const adjacency = new Map();

  transactions.forEach((transaction) => {
    if (!adjacency.has(transaction.sender_account)) {
      adjacency.set(transaction.sender_account, []);
    }
    adjacency.get(transaction.sender_account).push(transaction);
  });

  const paths = [];

  function walk(currentAccount, chain, visited) {
    const options = adjacency.get(currentAccount) || [];

    if (!options.length) {
      if (chain.length) {
        paths.push(chain);
      }
      return;
    }

    options.forEach((transaction) => {
      if (visited.has(transaction.receiver_account)) {
        return;
      }

      visited.add(transaction.receiver_account);
      walk(transaction.receiver_account, [...chain, transaction], visited);
      visited.delete(transaction.receiver_account);
    });
  }

  if (victimAccount) {
    walk(victimAccount, [], new Set([victimAccount]));
  }

  return paths.slice(0, 20);
}

function getReviewState(reviews, accountNumber) {
  return reviews[accountNumber] || {
    documents: [],
    verified: false,
    releasedAmount: 0,
  };
}

function buildNextTransferPredictions({
  accounts,
  statsMap,
  transactions,
  victimAccount,
  rootAmount,
}) {
  const latestTransactionTime = transactions.length
    ? safeDate(transactions[transactions.length - 1].timestamp)
    : new Date();
  const accountMap = new Map(accounts.map((account) => [account.account_number, account]));
  const aggregateTargets = new Map();
  const sourcePredictions = [];

  let activeSenders = accounts
    .filter((account) => {
      const stats = statsMap.get(account.account_number);
      return (
        account.account_number !== victimAccount &&
        account.classification !== "innocent" &&
        stats &&
        stats.outgoing.length > 0 &&
        (
          account.disputed_amount > 0 ||
          account.risk_score >= 30 ||
          stats.rapidSplit ||
          stats.recentBurst ||
          stats.outgoing.length >= 2
        )
      );
    })
    .map((account) => {
      const stats = statsMap.get(account.account_number);
      const exposureBasis = Math.max(
        account.disputed_amount || 0,
        account.current_balance || 0,
        stats.outgoingTotal * 0.15
      );
      const recencyMinutes = minutesBetween(stats.lastSeen, latestTransactionTime);
      const recencyIndex = Number.isFinite(recencyMinutes)
        ? clamp(100 - recencyMinutes * 2.5, 15, 100)
        : 25;
      const liquidityIndex = clamp(
        (exposureBasis / Math.max(rootAmount || 1, 1)) * 220,
        0,
        100
      );
      const patternIndex = clamp(
        (stats.rapidSplit ? 25 : 0) +
          (stats.recentBurst ? 18 : 0) +
          (stats.outgoing.length >= 2 ? 12 : stats.outgoing.length ? 6 : 0),
        0,
        100
      );
      const predictionConfidence = clamp(
        account.risk_score * 0.46 +
          liquidityIndex * 0.22 +
          recencyIndex * 0.2 +
          patternIndex * 0.12 -
          (account.account_status === "frozen" ? 10 : 0),
        0,
        100
      );

      return {
        ...account,
        prediction_confidence: Math.round(predictionConfidence),
        prediction_transfer_potential: round(exposureBasis),
      };
    })
    .sort(
      (left, right) =>
        right.prediction_confidence - left.prediction_confidence ||
        right.disputed_amount - left.disputed_amount
    );

  if (!activeSenders.length) {
    activeSenders = [...accounts]
      .filter((account) => {
        const stats = statsMap.get(account.account_number);
        return (
          account.account_number !== victimAccount &&
          stats &&
          stats.outgoing.length > 0 &&
          account.risk_score >= 35
        );
      })
      .sort((left, right) => right.risk_score - left.risk_score)
      .slice(0, 3)
      .map((account) => ({
        ...account,
        prediction_confidence: clamp(Math.round(account.risk_score * 0.75), 35, 85),
      }));
  }

  activeSenders.slice(0, 6).forEach((sender) => {
    const senderStats = statsMap.get(sender.account_number);
    const receiverHistory = senderStats.outgoing.reduce((map, transaction) => {
      map.set(
        transaction.receiver_account,
        (map.get(transaction.receiver_account) || 0) + 1
      );
      return map;
    }, new Map());
    const historicalTargets = Array.from(receiverHistory.keys())
      .map((accountNumber) => accountMap.get(accountNumber))
      .filter(Boolean);

    const scoredTargets = accounts
      .filter(
        (candidate) =>
          candidate.account_number !== sender.account_number &&
          candidate.account_number !== victimAccount &&
          candidate.account_status !== "frozen"
      )
      .map((candidate) => {
        const candidateStats = statsMap.get(candidate.account_number);
        const pairHistoryCount = receiverHistory.get(candidate.account_number) || 0;
        const sameBank = historicalTargets.some(
          (target) => target.bank_name && target.bank_name === candidate.bank_name
        );
        const sameDevice = historicalTargets.some(
          (target) =>
            target.device_id &&
            candidate.device_id &&
            target.device_id === candidate.device_id
        );
        const sameIp = historicalTargets.some(
          (target) =>
            target.ip_address &&
            candidate.ip_address &&
            target.ip_address === candidate.ip_address
        );
        const sameLocation = historicalTargets.some(
          (target) => target.location && target.location === candidate.location
        );
        const nextDepthMatch =
          candidate.chain_depth_level === sender.chain_depth_level + 1
            ? 1
            : candidate.chain_depth_level > sender.chain_depth_level
              ? 0.6
              : candidate.chain_depth_level === sender.chain_depth_level
                ? 0.25
                : 0;
        const candidateRoleBoost =
          candidate.classification === "cashout"
            ? 18
            : candidate.classification === "mule"
              ? 14
              : candidate.classification === "splitter"
                ? 10
                : 0;
        const legitimacyPenalty =
          candidate.trust_score >= 80
            ? 26
            : candidate.trust_score >= 65
              ? 14
              : 0;
        const baseScore =
          pairHistoryCount * 26 +
          (sameBank ? 10 : 0) +
          (sameDevice ? 18 : 0) +
          (sameIp ? 16 : 0) +
          (sameLocation ? 10 : 0) +
          nextDepthMatch * 12 +
          candidate.risk_score * 0.18 +
          (100 - candidate.trust_score) * 0.12 +
          candidateRoleBoost +
          (candidateStats?.rapidSplit ? 8 : 0) +
          (candidateStats?.recentBurst ? 6 : 0) -
          legitimacyPenalty -
          (candidate.is_verified_legitimate ? 20 : 0);

        if (
          pairHistoryCount === 0 &&
          !sameBank &&
          !sameDevice &&
          !sameIp &&
          !sameLocation &&
          nextDepthMatch === 0 &&
          candidate.risk_score < 60
        ) {
          return null;
        }

        const weightedScore = round(
          clamp(baseScore, 0, 100) * (sender.prediction_confidence / 100)
        );

        if (weightedScore < 18) {
          return null;
        }

        const reasons = [];
        if (pairHistoryCount > 0) {
          reasons.push(
            `${sender.account_number} has already routed funds to this account profile ${pairHistoryCount} time(s).`
          );
        }
        if (sameDevice) {
          reasons.push("Target shares device fingerprint with known downstream receivers.");
        }
        if (sameIp) {
          reasons.push("Target shares IP infrastructure with linked accounts.");
        }
        if (sameBank) {
          reasons.push("Target matches the bank pattern used in previous layering hops.");
        }
        if (sameLocation) {
          reasons.push("Target appears in the same geographic cluster as earlier recipients.");
        }
        if (nextDepthMatch >= 1) {
          reasons.push("Target fits the next-hop depth pattern in the current money trail.");
        }
        if (candidate.classification === "cashout") {
          reasons.push("Target behaves like a probable cashout endpoint.");
        }
        if (candidate.classification === "mule") {
          reasons.push("Target already resembles a mule account in the chain.");
        }
        if (candidate.trust_score >= 70) {
          reasons.push("Prediction confidence is reduced because the account also shows legitimacy indicators.");
        }

        return {
          account_number: candidate.account_number,
          account_holder_name: candidate.account_holder_name,
          bank_name: candidate.bank_name,
          weightedScore,
          predicted_amount: round(
            Math.min(
              sender.prediction_transfer_potential,
              sender.prediction_transfer_potential * clamp(baseScore, 15, 85) / 100
            )
          ),
          reasons,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.weightedScore - left.weightedScore)
      .slice(0, 3);

    if (!scoredTargets.length) {
      return;
    }

    sourcePredictions.push({
      source_account: sender.account_number,
      source_holder_name: sender.account_holder_name,
      source_confidence: sender.prediction_confidence,
      targets: scoredTargets,
    });

    scoredTargets.forEach((target) => {
      const existing = aggregateTargets.get(target.account_number) || {
        account_number: target.account_number,
        account_holder_name: target.account_holder_name,
        bank_name: target.bank_name,
        score: 0,
        predicted_amount: 0,
        reasons: [],
        source_accounts: [],
      };

      existing.score += target.weightedScore;
      existing.predicted_amount += target.predicted_amount;
      existing.reasons.push(...target.reasons);
      existing.source_accounts.push({
        account_number: sender.account_number,
        account_holder_name: sender.account_holder_name,
        confidence: sender.prediction_confidence,
      });
      aggregateTargets.set(target.account_number, existing);
    });
  });

  const rankedTargets = Array.from(aggregateTargets.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  const maxScore = rankedTargets[0]?.score || 1;
  const totalScore = rankedTargets.reduce((sum, target) => sum + target.score, 0) || 1;

  return {
    nextTransferPredictions: rankedTargets.map((target) => ({
      account_number: target.account_number,
      account_holder_name: target.account_holder_name,
      bank_name: target.bank_name,
      probability: clamp(
        Math.round((target.score / maxScore) * 42 + (target.score / totalScore) * 38 + 18),
        18,
        96
      ),
      predicted_amount: round(target.predicted_amount),
      reasons: [...new Set(target.reasons)].slice(0, 3),
      likely_source_accounts: [...target.source_accounts]
        .sort((left, right) => right.confidence - left.confidence)
        .slice(0, 2),
      recommendation:
        target.score >= 70
          ? "Pre-emptive freeze review"
          : target.score >= 48
            ? "Enhanced watch + nodal bank alert"
            : "Monitor only",
    })),
    nextTransferBySource: Object.fromEntries(
      sourcePredictions.map((prediction) => [prediction.source_account, prediction])
    ),
  };
}

function buildCriminalNetworks({
  accounts,
  statsMap,
  transactions,
  victimAccount,
}) {
  const suspiciousAccounts = accounts.filter((account) => {
    const stats = statsMap.get(account.account_number);
    return (
      account.account_number !== victimAccount &&
      stats &&
      (
        account.risk_score >= 30 ||
        account.disputed_amount > 0 ||
        account.freeze_priority >= 4 ||
        ["mastermind", "splitter", "mule", "cashout"].includes(account.classification) ||
        stats.rapidSplit ||
        stats.recentBurst
      )
    );
  });

  const suspiciousSet = new Set(suspiciousAccounts.map((account) => account.account_number));
  const accountMap = new Map(accounts.map((account) => [account.account_number, account]));
  const adjacency = new Map();
  const connectionReasons = new Map();

  suspiciousSet.forEach((accountNumber) => {
    adjacency.set(accountNumber, new Set());
    connectionReasons.set(accountNumber, []);
  });

  function connect(leftAccount, rightAccount, reason) {
    if (
      !leftAccount ||
      !rightAccount ||
      leftAccount === rightAccount ||
      !suspiciousSet.has(leftAccount) ||
      !suspiciousSet.has(rightAccount)
    ) {
      return;
    }

    adjacency.get(leftAccount).add(rightAccount);
    adjacency.get(rightAccount).add(leftAccount);
    connectionReasons.get(leftAccount).push(reason);
    connectionReasons.get(rightAccount).push(reason);
  }

  transactions.forEach((transaction) => {
    if (
      suspiciousSet.has(transaction.sender_account) &&
      suspiciousSet.has(transaction.receiver_account)
    ) {
      connect(
        transaction.sender_account,
        transaction.receiver_account,
        `${transaction.sender_account} -> ${transaction.receiver_account} via ${transaction.transaction_type}`
      );
    }
  });

  const deviceGroups = new Map();
  const ipGroups = new Map();

  suspiciousAccounts.forEach((account) => {
    if (account.device_id) {
      if (!deviceGroups.has(account.device_id)) {
        deviceGroups.set(account.device_id, []);
      }
      deviceGroups.get(account.device_id).push(account.account_number);
    }

    if (account.ip_address) {
      if (!ipGroups.has(account.ip_address)) {
        ipGroups.set(account.ip_address, []);
      }
      ipGroups.get(account.ip_address).push(account.account_number);
    }
  });

  deviceGroups.forEach((members, deviceId) => {
    if (members.length < 2) {
      return;
    }
    members.forEach((left, index) => {
      members.slice(index + 1).forEach((right) => {
        connect(left, right, `Shared device ${deviceId}`);
      });
    });
  });

  ipGroups.forEach((members, ipAddress) => {
    if (members.length < 2) {
      return;
    }
    members.forEach((left, index) => {
      members.slice(index + 1).forEach((right) => {
        connect(left, right, `Shared IP ${ipAddress}`);
      });
    });
  });

  const visited = new Set();
  const networks = [];

  suspiciousAccounts.forEach((account) => {
    if (visited.has(account.account_number)) {
      return;
    }

    const queue = [account.account_number];
    const members = [];
    visited.add(account.account_number);

    while (queue.length) {
      const current = queue.shift();
      members.push(current);

      (adjacency.get(current) || []).forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    const memberAccounts = members
      .map((accountNumber) => accountMap.get(accountNumber))
      .filter(Boolean)
      .sort(
        (left, right) =>
          left.chain_depth_level - right.chain_depth_level ||
          right.risk_score - left.risk_score
      );

    if (!memberAccounts.length) {
      return;
    }

    const memberSet = new Set(memberAccounts.map((member) => member.account_number));
    const networkTransactions = transactions.filter(
      (transaction) =>
        memberSet.has(transaction.sender_account) && memberSet.has(transaction.receiver_account)
    );
    const networkRisk = Math.round(
      memberAccounts.reduce((sum, member) => sum + member.risk_score, 0) / memberAccounts.length
    );
    const highestRisk = Math.max(...memberAccounts.map((member) => member.risk_score), 0);
    const totalDisputed = round(
      memberAccounts.reduce((sum, member) => sum + (member.disputed_amount || 0), 0)
    );
    const muleLikeMembers = memberAccounts.filter((member) =>
      ["mastermind", "splitter", "mule", "cashout"].includes(member.classification)
    );
    const sharedDevices = [...new Set(memberAccounts.map((member) => member.device_id).filter(Boolean))]
      .filter((deviceId) => (deviceGroups.get(deviceId) || []).length > 1);
    const sharedIps = [...new Set(memberAccounts.map((member) => member.ip_address).filter(Boolean))]
      .filter((ipAddress) => (ipGroups.get(ipAddress) || []).length > 1);

    const label =
      muleLikeMembers.length >= 2
        ? "Possible Mule Network Detected"
        : "Suspicious Linked Network";

    const orderedPath = memberAccounts
      .map((member) => member.account_number)
      .join(" -> ");

    networks.push({
      id: `network-${String(networks.length + 1).padStart(2, "0")}`,
      name: `Network ${networks.length + 1}`,
      label,
      account_numbers: memberAccounts.map((member) => member.account_number),
      members: memberAccounts,
      member_count: memberAccounts.length,
      transaction_count: networkTransactions.length,
      average_risk_score: networkRisk,
      highest_risk_score: highestRisk,
      total_disputed_amount: totalDisputed,
      path_preview: orderedPath,
      shared_signals: {
        devices: sharedDevices,
        ips: sharedIps,
      },
      key_indicators: [
        `${memberAccounts.length} linked suspect account(s) moving funds across ${networkTransactions.length} internal hop(s).`,
        sharedDevices.length
          ? `${sharedDevices.length} shared device fingerprint(s) tie the network together.`
          : "No shared device fingerprint across this cluster.",
        sharedIps.length
          ? `${sharedIps.length} shared IP address cluster(s) support common control.`
          : "No shared IP cluster across this network.",
      ],
      recommendation:
        highestRisk >= 65 || totalDisputed >= 10000
          ? "Freeze network leaders and all immediate downstream mule accounts."
          : "Keep the network under enhanced watch and verify linked accounts quickly.",
    });
  });

  const sortedNetworks = networks
    .filter((network) => network.member_count >= 2 || network.transaction_count >= 1)
    .sort(
      (left, right) =>
        right.highest_risk_score - left.highest_risk_score ||
        right.member_count - left.member_count
    );

  const networkByAccount = Object.fromEntries(
    sortedNetworks.flatMap((network) =>
      network.account_numbers.map((accountNumber) => [accountNumber, network])
    )
  );

  return {
    criminalNetworks: sortedNetworks,
    networkByAccount,
  };
}

function buildRecoveryOptimizer({
  accounts,
  immediateFreeze,
  networkByAccount,
  rootAmount,
}) {
  const candidates = accounts
    .filter((account) => account.account_number && account.disputed_amount > 0)
    .map((account) => {
      const linkedNetwork = networkByAccount[account.account_number];
      const estimatedRecovery = round(
        Math.max(0, account.disputed_amount - (account.released_amount || 0))
      );
      const recoveryScore = clamp(
        estimatedRecovery / Math.max(rootAmount || 1, 1) * 100 * 0.55 +
          account.risk_score * 0.2 +
          account.freeze_priority * 6 +
          (linkedNetwork ? Math.min(linkedNetwork.member_count * 4, 20) : 0) +
          (account.account_status === "frozen" ? -8 : 10),
        0,
        100
      );

      const reasons = [];
      if (estimatedRecovery > 0) {
        reasons.push(`Freezing this account can hold about ${formatCurrency(estimatedRecovery)} immediately.`);
      }
      if (account.risk_score >= 65) {
        reasons.push("High-risk movement pattern increases urgency.");
      }
      if (linkedNetwork) {
        reasons.push(`${linkedNetwork.name} is already behaving like a coordinated fraud ring.`);
      }
      if (account.account_status === "frozen") {
        reasons.push("Account is already frozen, so recovery follow-up should be prioritized now.");
      } else {
        reasons.push("Account is still active, so delay increases leakage risk.");
      }

      return {
        account_number: account.account_number,
        account_holder_name: account.account_holder_name,
        bank_name: account.bank_name,
        estimated_recovery: estimatedRecovery,
        recovery_score: Math.round(recoveryScore),
        risk_score: account.risk_score,
        freeze_priority: account.freeze_priority,
        account_status: account.account_status,
        network_name: linkedNetwork?.name || null,
        action:
          account.account_status === "frozen"
            ? "Already frozen - push recovery"
            : "Freeze immediately",
        reasons,
      };
    })
    .sort(
      (left, right) =>
        right.estimated_recovery - left.estimated_recovery ||
        right.recovery_score - left.recovery_score
    );

  const topStrategy = candidates.slice(0, 8);
  const optimizedRecovery = round(
    topStrategy.reduce((sum, candidate) => sum + candidate.estimated_recovery, 0)
  );
  const pendingActions = topStrategy.filter(
    (candidate) => candidate.account_status !== "frozen"
  ).length;

  return {
    freezeStrategy: topStrategy,
    optimizedRecovery,
    pendingActions,
    topRecommendation: topStrategy[0] || null,
    summary:
      topStrategy.length
        ? `Top ${topStrategy.length} accounts can secure about ${formatCurrency(optimizedRecovery)} if acted on immediately.`
      : "No recoverable disputed balances are available for optimization right now.",
  };
}

function buildAutoStrikeMode({
  accounts,
  victimAccount,
  immediateFreeze,
  rootAmount,
  networkByAccount,
  preWithdrawalFraudLock,
  digitalCriminalTwin,
}) {
  const immediateFreezeSet = new Set(
    (immediateFreeze || []).map((account) => account.account_number)
  );
  const emergencyMap = new Map(
    (preWithdrawalFraudLock?.emergencyFreezeTargets || []).map((target) => [
      target.account_number,
      target,
    ])
  );
  const twinByAccount = digitalCriminalTwin?.twinByAccount || {};
  const candidates = accounts
    .filter(
      (account) =>
        account.account_number !== victimAccount && account.disputed_amount > 0
    )
    .map((account) => {
      const linkedNetwork = networkByAccount[account.account_number];
      const twinProfile = twinByAccount[account.account_number];
      const emergencyTarget = emergencyMap.get(account.account_number);
      const recoverableAmount = round(
        Math.max(0, account.disputed_amount - (account.released_amount || 0))
      );
      const strikeScore = Math.round(
        clamp(
          (recoverableAmount / Math.max(rootAmount || 1, 1)) * 100 * 0.36 +
            account.risk_score * 0.18 +
            account.freeze_priority * 5.2 +
            (linkedNetwork ? Math.min(linkedNetwork.member_count * 5, 24) : 0) +
            (twinProfile ? Math.min(twinProfile.member_count * 4, 18) : 0) +
            (emergencyTarget ? emergencyTarget.withdrawal_risk * 0.18 : 0) +
            (immediateFreezeSet.has(account.account_number) ? 8 : 0) +
            (account.account_status === "frozen" ? -12 : 10),
          0,
          100
        )
      );

      return {
        account_number: account.account_number,
        account_holder_name: account.account_holder_name,
        bank_name: account.bank_name,
        recoverable_amount: recoverableAmount,
        strike_score: strikeScore,
        account_status: account.account_status,
        risk_score: account.risk_score,
        freeze_priority: account.freeze_priority,
        network_name: linkedNetwork?.name || null,
        twin_name: twinProfile?.name || null,
        emergency_risk: emergencyTarget?.withdrawal_risk || 0,
      };
    })
    .sort(
      (left, right) =>
        right.strike_score - left.strike_score ||
        right.recoverable_amount - left.recoverable_amount
    );

  const recommendedTargets = candidates.slice(0, 3);
  const coveredNetworks = new Set(
    recommendedTargets.map((target) => target.network_name).filter(Boolean)
  );
  const coveredTwins = new Set(
    recommendedTargets.map((target) => target.twin_name).filter(Boolean)
  );
  const emergencyCoverage = recommendedTargets.filter(
    (target) => target.emergency_risk >= 65
  ).length;
  const recoveryPotential = round(
    recommendedTargets.reduce((sum, target) => sum + target.recoverable_amount, 0)
  );
  const collapseScore = Math.round(
    clamp(
      (recoveryPotential / Math.max(rootAmount || 1, 1)) * 100 * 0.34 +
        coveredNetworks.size * 18 +
        coveredTwins.size * 14 +
        emergencyCoverage * 12 +
        (recommendedTargets.reduce((sum, target) => sum + target.strike_score, 0) /
          Math.max(recommendedTargets.length || 1, 1)) *
          0.22,
      0,
      99
    )
  );

  const reasons = [];
  if (coveredNetworks.size) {
    reasons.push(
      `Strike covers ${coveredNetworks.size} fraud network cluster(s).`
    );
  }
  if (coveredTwins.size) {
    reasons.push(
      `Strike hits ${coveredTwins.size} digital mastermind profile(s).`
    );
  }
  if (emergencyCoverage) {
    reasons.push(
      `${emergencyCoverage} target(s) are already in emergency withdrawal-risk territory.`
    );
  }
  if (recoveryPotential > 0) {
    reasons.push(
      `Estimated simultaneous hold value is ${formatCurrency(recoveryPotential)}.`
    );
  }

  return {
    recommendedTargets,
    networkCollapse: collapseScore,
    recoveryPotential,
    summary: recommendedTargets.length
      ? `Freeze the top ${recommendedTargets.length} accounts together for a projected network collapse of ${collapseScore}% and possible hold of ${formatCurrency(recoveryPotential)}.`
      : "No three-account coordinated strike is available right now.",
    reasons,
  };
}

function buildFraudDominoCollapseSystem({
  accounts,
  transactions,
  victimAccount,
  rootAmount,
  networkByAccount,
  preWithdrawalFraudLock,
  digitalCriminalTwin,
}) {
  const accountMap = new Map(accounts.map((account) => [account.account_number, account]));
  const emergencyMap = new Map(
    (preWithdrawalFraudLock?.emergencyFreezeTargets || []).map((target) => [
      target.account_number,
      target,
    ])
  );
  const twinByAccount = digitalCriminalTwin?.twinByAccount || {};
  const adjacency = new Map();

  transactions.forEach((transaction) => {
    if (!adjacency.has(transaction.sender_account)) {
      adjacency.set(transaction.sender_account, []);
    }
    adjacency.get(transaction.sender_account).push(transaction);
  });

  const rankings = accounts
    .filter(
      (account) =>
        account.account_number !== victimAccount && account.disputed_amount > 0
    )
    .map((account) => {
      const visitedAccounts = new Set([account.account_number]);
      const impactedTransactions = [];
      const impactedNetworks = new Set();
      const impactedTwins = new Set();
      const queue = [account.account_number];

      while (queue.length) {
        const current = queue.shift();
        const outgoing = adjacency.get(current) || [];

        outgoing.forEach((transaction) => {
          impactedTransactions.push(transaction);
          const receiver = transaction.receiver_account;

          if (!visitedAccounts.has(receiver)) {
            visitedAccounts.add(receiver);
            queue.push(receiver);
          }
        });

        const network = networkByAccount[current];
        if (network?.name) {
          impactedNetworks.add(network.name);
        }
        const twin = twinByAccount[current];
        if (twin?.name) {
          impactedTwins.add(twin.name);
        }
      }

      const impactedAccounts = [...visitedAccounts]
        .map((accountNumber) => accountMap.get(accountNumber))
        .filter(Boolean);
      const downstreamAccounts = impactedAccounts.filter(
        (candidate) => candidate.account_number !== account.account_number
      );
      const downstreamAmount = round(
        impactedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
      );
      const recoverableHold = round(
        impactedAccounts.reduce(
          (sum, candidate) => sum + Math.max(0, candidate.disputed_amount || 0),
          0
        )
      );
      const emergencyTargetsBlocked = impactedAccounts.filter((candidate) =>
        emergencyMap.has(candidate.account_number)
      ).length;
      const collapseScore = Math.round(
        clamp(
          (downstreamAmount / Math.max(rootAmount || 1, 1)) * 100 * 0.34 +
            downstreamAccounts.length * 7 +
            impactedTransactions.length * 3 +
            impactedNetworks.size * 13 +
            impactedTwins.size * 11 +
            emergencyTargetsBlocked * 10 +
            account.risk_score * 0.16 +
            account.freeze_priority * 4,
          0,
          99
        )
      );

      const reasons = [
        `Freezing this account first can disrupt ${impactedTransactions.length} downstream transaction(s).`,
        `Potentially blocks ${downstreamAccounts.length} downstream account(s) and ${formatCurrency(downstreamAmount)} in onward movement.`,
      ];
      if (impactedNetworks.size) {
        reasons.push(`Impacts ${impactedNetworks.size} linked fraud network cluster(s).`);
      }
      if (impactedTwins.size) {
        reasons.push(`Touches ${impactedTwins.size} digital mastermind profile(s).`);
      }
      if (emergencyTargetsBlocked) {
        reasons.push(`Stops ${emergencyTargetsBlocked} emergency-withdrawal target(s) in the chain.`);
      }

      return {
        account_number: account.account_number,
        account_holder_name: account.account_holder_name,
        bank_name: account.bank_name,
        collapse_score: collapseScore,
        disrupted_transactions: impactedTransactions.length,
        downstream_accounts_blocked: downstreamAccounts.length,
        downstream_amount_blocked: downstreamAmount,
        recoverable_hold: recoverableHold,
        impacted_networks: [...impactedNetworks],
        impacted_twins: [...impactedTwins],
        reasons,
      };
    })
    .sort(
      (left, right) =>
        right.collapse_score - left.collapse_score ||
        right.disrupted_transactions - left.disrupted_transactions ||
        right.downstream_amount_blocked - left.downstream_amount_blocked
    );

  return {
    topTarget: rankings[0] || null,
    rankings: rankings.slice(0, 6),
    summary: rankings.length
      ? `Freeze ${rankings[0].account_number} first to collapse about ${rankings[0].collapse_score}% of the active downstream fraud chain.`
      : "No strong domino-collapse target is available right now.",
  };
}

function buildHumanVulnerabilityDetector({
  caseData,
  accounts,
  statsMap,
  transactions,
  victimAccount,
}) {
  const victim = accounts.find((account) => account.account_number === victimAccount) || null;
  const victimStats = victimAccount ? statsMap.get(victimAccount) : null;
  const victimOutgoing = victimStats?.outgoing || [];
  const firstVictimTransfer = victimOutgoing[0] || null;
  const fraudReportedTime = safeDate(caseData.fraud_timestamp);
  const firstVictimTransferTime = safeDate(firstVictimTransfer?.timestamp);
  const responseDelayMinutes = firstVictimTransferTime && fraudReportedTime
    ? round(minutesBetween(fraudReportedTime, firstVictimTransferTime))
    : null;

  const age = Number(caseData.victim_age || 0);
  const scamCalls = Number(caseData.suspected_scam_calls || 0);
  const phishingMessages = Number(caseData.suspected_phishing_messages || 0);
  const priorComplaints = Number(caseData.prior_fraud_complaints || 0);
  const repeatOtpExposure = Number(caseData.repeat_otp_exposure || 0);
  const digitalLiteracy = String(caseData.digital_literacy || "").toLowerCase();
  const fraudType = String(caseData.fraud_type || "").toLowerCase();

  const ageScore =
    age >= 65 ? 100 : age >= 55 ? 65 : age >= 45 ? 28 : 0;
  const otpScore =
    fraudType.includes("otp")
      ? clamp(55 + repeatOtpExposure * 16, 0, 100)
      : clamp(repeatOtpExposure * 18, 0, 80);
  const phishingScore =
    fraudType.includes("phishing")
      ? clamp(58 + phishingMessages * 10, 0, 100)
      : clamp(phishingMessages * 12, 0, 90);
  const repeatVictimScore = clamp(priorComplaints * 28, 0, 100);
  const scamPressureScore = clamp(scamCalls * 14, 0, 100);
  const literacyScore =
    digitalLiteracy === "low"
      ? 78
      : digitalLiteracy === "medium"
        ? 34
        : 0;
  const responseScore =
    responseDelayMinutes === null
      ? 0
      : responseDelayMinutes <= 2
        ? 82
        : responseDelayMinutes <= 10
          ? 58
          : responseDelayMinutes <= 30
            ? 28
            : 0;

  const vulnerabilityScore = Math.round(
    clamp(
      ageScore * 0.22 +
        otpScore * 0.18 +
        phishingScore * 0.15 +
        repeatVictimScore * 0.16 +
        scamPressureScore * 0.14 +
        literacyScore * 0.08 +
        responseScore * 0.07,
      0,
      99
    )
  );

  const signals = [];
  if (age >= 65) {
    signals.push(`Age ${age}+ senior citizen profile raises social-engineering exposure.`);
  }
  if (scamCalls >= 2) {
    signals.push(`${scamCalls} scam-call attempt(s) were reported before or around the fraud event.`);
  }
  if (repeatOtpExposure >= 1 || fraudType.includes("otp")) {
    signals.push(
      repeatOtpExposure >= 1
        ? `OTP-sharing exposure appears repeated across ${repeatOtpExposure} known incident(s).`
        : "Current case pattern matches OTP-sharing fraud exposure."
    );
  }
  if (phishingMessages >= 2 || fraudType.includes("phishing")) {
    signals.push(
      phishingMessages >= 1
        ? `${phishingMessages} phishing or spoofed-message contact(s) were reported.`
        : "Case pattern indicates likely phishing-message exposure."
    );
  }
  if (priorComplaints >= 1) {
    signals.push(`Citizen has ${priorComplaints} prior fraud complaint(s), suggesting repeat targeting.`);
  }
  if (responseDelayMinutes !== null && responseDelayMinutes <= 10) {
    signals.push(`Victim transferred funds within ${responseDelayMinutes} minute(s) of the reported fraud event.`);
  }
  if (digitalLiteracy === "low") {
    signals.push("Low digital-literacy indicator suggests higher compliance risk during scam pressure.");
  }

  const profileLabel =
    vulnerabilityScore >= 75
      ? "High Risk Citizen Profile"
      : vulnerabilityScore >= 50
        ? "Elevated Victim Risk Profile"
        : "Moderate Victim Risk Profile";

  const preventionActions = [
    "Mark the citizen for high-touch callback verification before large or unusual transfers.",
    "Push OTP-sharing and phishing awareness alerts to the registered mobile number.",
    "Recommend bank-side cooling checks for sudden first-time high-value transfers.",
  ];
  if (age >= 65) {
    preventionActions.unshift(
      "Add senior-citizen assisted verification before urgent remote-payment requests."
    );
  }
  if (priorComplaints >= 1) {
    preventionActions.unshift(
      "Escalate repeat-target protection with proactive watchlisting and cyber-cell follow-up."
    );
  }

  return {
    profileLabel,
    vulnerabilityScore,
    age: age || null,
    citizenSegment: caseData.citizen_segment || (age >= 60 ? "senior_citizen" : "general"),
    scamCalls,
    phishingMessages,
    priorComplaints,
    repeatOtpExposure,
    responseDelayMinutes,
    victimName: caseData.victim_name || victim?.account_holder_name || "Unknown Victim",
    victimAccount: victimAccount || caseData.victim_account || "",
    bankName: caseData.victim_bank || victim?.bank_name || "Unknown Bank",
    signals,
    preventionActions,
    summary:
      signals.length
        ? `${profileLabel} detected with ${signals.length} vulnerability signal(s).`
        : "No strong victim-risk pattern is available yet.",
  };
}

function buildEmergencyVictimProtectionMode({
  caseData,
  accounts,
  victimAccount,
  immediateFreeze,
  preWithdrawalFraudLock,
  nextTransferPredictions,
  digitalCriminalTwin,
}) {
  const victim = accounts.find((account) => account.account_number === victimAccount) || null;
  const suspiciousAccounts = immediateFreeze.slice(0, 5);
  const emergencyTargets = (preWithdrawalFraudLock?.emergencyFreezeTargets || []).slice(0, 4);
  const predictedTargets = (nextTransferPredictions || []).slice(0, 3);
  const twinProfiles = (digitalCriminalTwin?.profiles || []).slice(0, 2);
  const victimStatus = victim?.account_status || "active";
  const fraudAmount = Number(caseData.fraud_amount || 0);

  const protectionScore = Math.round(
    clamp(
      suspiciousAccounts.length * 14 +
        emergencyTargets.length * 18 +
        predictedTargets.length * 10 +
        twinProfiles.length * 9 +
        (victimStatus === "active" ? 12 : 3) +
        (fraudAmount >= 50000 ? 12 : fraudAmount >= 10000 ? 6 : 2),
      0,
      99
    )
  );

  const actions = [
    {
      key: "block_suspicious_transfers",
      title: "Block suspicious transfers",
      description:
        suspiciousAccounts.length
          ? `Freeze or hard-block ${suspiciousAccounts.length} linked suspect account(s) immediately.`
          : "Place protective block on newly discovered suspicious beneficiaries.",
      status: suspiciousAccounts.length ? "active" : "standby",
    },
    {
      key: "monitor_login_attempts",
      title: "Monitor login attempts",
      description:
        victim
          ? `Watch the victim profile for abnormal login attempts from new devices or IPs beyond ${victim.device_id || "known device"}.`
          : "Enable urgent login monitoring for the victim account and connected channels.",
      status: "active",
    },
    {
      key: "alert_bank_security",
      title: "Alert bank security",
      description: `Issue a nodal-security alert for case ${caseData.complaint_id} and preserve channel/device metadata.`,
      status: "active",
    },
  ];

  const monitoredSignals = [
    `Victim account ${victimAccount || caseData.victim_account || "unknown"} is under emergency watch.`,
    suspiciousAccounts.length
      ? `${suspiciousAccounts.length} suspect beneficiary account(s) are queued for immediate protective action.`
      : "No beneficiary block list is ready yet.",
    emergencyTargets.length
      ? `${emergencyTargets.length} emergency-withdrawal target(s) are being monitored for leakage risk.`
      : "No downstream emergency-withdrawal target is currently above threshold.",
    twinProfiles.length
      ? `${twinProfiles.length} mastermind profile(s) are linked to the active fraud chain.`
      : "No mastermind profile is strong enough yet.",
  ];

  const protectedTargets = [
    ...suspiciousAccounts.map((account) => ({
      account_number: account.account_number,
      account_holder_name: account.account_holder_name,
      bank_name: account.bank_name,
      reason: "Linked suspect account",
    })),
    ...predictedTargets
      .filter(
        (target) =>
          !suspiciousAccounts.some(
            (account) => account.account_number === target.account_number
          )
      )
      .map((target) => ({
        account_number: target.account_number,
        account_holder_name: target.account_holder_name,
        bank_name: target.bank_name,
        reason: "Predicted suspicious receiver",
      })),
  ].slice(0, 6);

  return {
    active: true,
    status: "Emergency Protection Activated",
    protectionScore,
    victimName: caseData.victim_name || victim?.account_holder_name || "Unknown Victim",
    victimAccount: victimAccount || caseData.victim_account || "",
    victimBank: caseData.victim_bank || victim?.bank_name || "Unknown Bank",
    monitoredSignals,
    actions,
    protectedTargets,
    summary: `Emergency protection is active with ${protectionScore}% intensity for the victim account.`,
  };
}

function buildBehaviorFingerprint({
  accounts,
  statsMap,
  transactions,
  criminalNetworks,
  victimAccount,
}) {
  const suspectAccounts = accounts.filter((account) => account.account_number !== victimAccount);
  const suspectSet = new Set(suspectAccounts.map((account) => account.account_number));
  const suspectTransactions = transactions.filter(
    (transaction) =>
      suspectSet.has(transaction.sender_account) || suspectSet.has(transaction.receiver_account)
  );
  const sortedTransactions = [...suspectTransactions].sort(
    (left, right) => new Date(left.timestamp) - new Date(right.timestamp)
  );

  const rapidSplitAccounts = suspectAccounts.filter(
    (account) => statsMap.get(account.account_number)?.rapidSplit
  );
  const burstAccounts = suspectAccounts.filter(
    (account) => statsMap.get(account.account_number)?.recentBurst
  );
  const newAccounts = suspectAccounts.filter(
    (account) => account.stats?.account_age_days <= 90
  );
  const nightTransactions = sortedTransactions.filter((transaction) => {
    const hour = new Date(transaction.timestamp).getHours();
    return hour >= 22 || hour < 6;
  });

  let rapidIntervals = 0;
  for (let index = 1; index < sortedTransactions.length; index += 1) {
    const previous = safeDate(sortedTransactions[index - 1].timestamp);
    const current = safeDate(sortedTransactions[index].timestamp);
    if (minutesBetween(previous, current) <= 2) {
      rapidIntervals += 1;
    }
  }

  const amountValues = sortedTransactions.map((transaction) => transaction.amount).sort((left, right) => left - right);
  let largestSimilarAmountCluster = amountValues.length ? 1 : 0;
  let currentCluster = amountValues.length ? 1 : 0;

  for (let index = 1; index < amountValues.length; index += 1) {
    const previous = amountValues[index - 1];
    const current = amountValues[index];
    const differenceRatio = Math.abs(current - previous) / Math.max(previous, 1);

    if (differenceRatio <= 0.12) {
      currentCluster += 1;
    } else {
      currentCluster = 1;
    }

    if (currentCluster > largestSimilarAmountCluster) {
      largestSimilarAmountCluster = currentCluster;
    }
  }

  const maxDepth = Math.max(...suspectAccounts.map((account) => account.chain_depth_level), 0);
  const sharedInfrastructureScore = clamp(
    criminalNetworks.reduce(
      (sum, network) =>
        sum +
        ((network.shared_signals?.devices?.length || 0) * 18) +
        ((network.shared_signals?.ips?.length || 0) * 15),
      0
    ),
    0,
    100
  );
  const networkStrength = clamp(
    criminalNetworks.reduce(
      (sum, network) => sum + network.member_count * 10 + network.transaction_count * 6,
      0
    ),
    0,
    100
  );

  const rapidSplitScore = clamp(
    (rapidSplitAccounts.length / Math.max(suspectAccounts.length, 1)) * 100 * 1.9,
    0,
    100
  );
  const burstScore = clamp(
    Math.max(
      (burstAccounts.length / Math.max(suspectAccounts.length, 1)) * 100 * 1.8,
      rapidIntervals * 18
    ),
    0,
    100
  );
  const newAccountScore = clamp(
    (newAccounts.length / Math.max(suspectAccounts.length, 1)) * 100 * 1.7,
    0,
    100
  );
  const nightScore = clamp(
    (nightTransactions.length / Math.max(sortedTransactions.length, 1)) * 100 * 2.2,
    0,
    100
  );
  const amountSimilarityScore = clamp(
    (largestSimilarAmountCluster / Math.max(amountValues.length, 1)) * 100 * 1.6,
    0,
    100
  );
  const multiHopScore = clamp(maxDepth * 22, 0, 100);

  const patternCandidates = [
    {
      label: "Rapid splitting",
      score: rapidSplitScore,
      evidence: `${rapidSplitAccounts.length} account(s) split incoming funds quickly.`,
    },
    {
      label: "High-velocity bursts",
      score: burstScore,
      evidence: `${rapidIntervals} near-instant transaction gap(s) found in the trail.`,
    },
    {
      label: "New accounts",
      score: newAccountScore,
      evidence: `${newAccounts.length} recently opened account(s) were used in the chain.`,
    },
    {
      label: "Night transactions",
      score: nightScore,
      evidence: `${nightTransactions.length} transaction(s) landed in late-night windows.`,
    },
    {
      label: "Repeated amount bands",
      score: amountSimilarityScore,
      evidence: `${largestSimilarAmountCluster} transfers cluster around similar amounts.`,
    },
    {
      label: "Shared control signals",
      score: sharedInfrastructureScore,
      evidence: "Shared device and IP signals point to centralized operator control.",
    },
    {
      label: "Multi-hop layering",
      score: multiHopScore,
      evidence: `Funds reached depth level ${maxDepth} across the chain.`,
    },
  ]
    .filter((pattern) => pattern.score >= 18)
    .sort((left, right) => right.score - left.score);

  const topPatterns = patternCandidates.slice(0, 3);
  let fraudType = "Suspicious Coordinated Transfers";

  if (
    criminalNetworks.length &&
    (rapidSplitScore >= 45 || sharedInfrastructureScore >= 35 || newAccountScore >= 35)
  ) {
    fraudType = "Mule Network";
  } else if (rapidSplitScore >= 50 && multiHopScore >= 45) {
    fraudType = "Layered Laundering";
  } else if (burstScore >= 45 && amountSimilarityScore >= 30) {
    fraudType = "Burst Dispersal";
  } else if (amountSimilarityScore >= 45) {
    fraudType = "Structured Routing";
  }

  const confidence = Math.round(
    clamp(
      24 +
        rapidSplitScore * 0.18 +
        burstScore * 0.17 +
        newAccountScore * 0.14 +
        nightScore * 0.1 +
        amountSimilarityScore * 0.13 +
        sharedInfrastructureScore * 0.14 +
        multiHopScore * 0.06 +
        networkStrength * 0.08,
      28,
      98
    )
  );

  return {
    fraudType,
    confidence,
    topPatterns: topPatterns.map((pattern) => pattern.label),
    patternSummary: topPatterns.length
      ? `${topPatterns.map((pattern) => pattern.label).join(" + ")}`
      : "No consistent behavior fingerprint yet.",
    explanation:
      topPatterns.length
        ? `Pattern detected: ${topPatterns.map((pattern) => pattern.label).join(" + ")}. Fraud type likely matches ${fraudType}.`
        : "More transactions are needed to lock a reliable fraud behavior profile.",
    evidence: topPatterns.map((pattern) => pattern.evidence),
    metrics: {
      rapidSplitScore: Math.round(rapidSplitScore),
      burstScore: Math.round(burstScore),
      newAccountScore: Math.round(newAccountScore),
      nightScore: Math.round(nightScore),
      amountSimilarityScore: Math.round(amountSimilarityScore),
      sharedInfrastructureScore: Math.round(sharedInfrastructureScore),
      networkStrength: Math.round(networkStrength),
      multiHopScore: Math.round(multiHopScore),
    },
  };
}

function buildMuleAccountDetector({
  accounts,
  statsMap,
  transactions,
  victimAccount,
}) {
  const accountMap = new Map(accounts.map((account) => [account.account_number, account]));
  const detections = accounts
    .filter((account) => account.account_number !== victimAccount)
    .map((account) => {
      const stats = statsMap.get(account.account_number);
      const incomingTransactions = stats?.incoming || [];
      const outgoingTransactions = stats?.outgoing || [];
      const senderAccounts = [...(stats?.senders || [])];
      const senderBanks = new Set();
      const senderLocations = new Set();

      senderAccounts.forEach((senderAccountNumber) => {
        const senderAccount = accountMap.get(senderAccountNumber);
        if (senderAccount?.bank_name) {
          senderBanks.add(senderAccount.bank_name);
        }
        if (senderAccount?.location) {
          senderLocations.add(senderAccount.location);
        }
      });

      let fastCashoutCount = 0;
      incomingTransactions.forEach((incomingTransaction) => {
        const incomingTime = safeDate(incomingTransaction.timestamp);
        const matchingCashouts = outgoingTransactions.filter((outgoingTransaction) => {
          const outgoingTime = safeDate(outgoingTransaction.timestamp);
          return (
            outgoingTime &&
            incomingTime &&
            outgoingTime >= incomingTime &&
            minutesBetween(incomingTime, outgoingTime) <= 30
          );
        });

        if (matchingCashouts.length) {
          fastCashoutCount += 1;
        }
      });

      const cashoutRatio = stats?.incomingTotal
        ? clamp((stats.outgoingTotal / stats.incomingTotal) * 100, 0, 100)
        : 0;
      const effectiveSourceCount = senderAccounts.length + Math.max(0, (account.chain_depth_level || 0) - 1);
      const ageScore = account.stats?.account_age_days <= 30
        ? 100
        : account.stats?.account_age_days <= 60
          ? 65
          : 15;
      const unrelatedSenderScore = clamp(
        effectiveSourceCount * 12 +
          senderBanks.size * 10 +
          senderLocations.size * 8,
        0,
        100
      );
      const quickCashoutScore = clamp(
        fastCashoutCount * 26 + cashoutRatio * 0.55,
        0,
        100
      );

      const confidence = Math.round(
        clamp(
          ageScore * 0.3 +
            unrelatedSenderScore * 0.32 +
            quickCashoutScore * 0.28 +
            account.risk_score * 0.1,
          0,
          99
        )
      );

      const isPossibleMule =
        account.stats?.account_age_days <= 30 &&
        effectiveSourceCount >= 2 &&
        (fastCashoutCount >= 1 || cashoutRatio >= 70);

      const reasons = [];
      if (account.stats?.account_age_days <= 30) {
        reasons.push(`Account age: ${account.stats.account_age_days} day(s).`);
      }
      if (senderAccounts.length) {
        reasons.push(
          `Transactions received from ${senderAccounts.length} account(s) across ${senderBanks.size || 1} bank cluster(s).`
        );
      }
      if (fastCashoutCount) {
        reasons.push(
          `Funds were moved out quickly after receipt in ${fastCashoutCount} instance(s).`
        );
      }
      if (cashoutRatio >= 70) {
        reasons.push(`${Math.round(cashoutRatio)}% of incoming funds were pushed out rapidly.`);
      }

      return {
        account_number: account.account_number,
        account_holder_name: account.account_holder_name,
        bank_name: account.bank_name,
        account_age_days: account.stats?.account_age_days || 0,
        incoming_sources: senderAccounts.length,
        effective_source_count: effectiveSourceCount,
        sender_bank_clusters: senderBanks.size,
        sender_location_clusters: senderLocations.size,
        fast_cashout_instances: fastCashoutCount,
        cashout_ratio: Math.round(cashoutRatio),
        confidence,
        status: isPossibleMule ? "Possible Mule Account" : "Watch Account",
        reasons,
      };
    })
    .filter(
      (account) =>
        account.confidence >= 45 &&
        (account.status === "Possible Mule Account" || account.effective_source_count >= 2)
    )
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.fast_cashout_instances - left.fast_cashout_instances ||
        right.incoming_sources - left.incoming_sources
    );

  return {
    muleAccountDetections: detections,
    topMuleAccount: detections[0] || null,
    summary: detections.length
      ? `${detections.length} account(s) match mule behavior indicators.`
      : "No account currently matches the mule profile strongly enough.",
  };
}

function buildIdentityLinkDetection({
  accounts,
  victimAccount,
}) {
  const relevantAccounts = accounts.filter(
    (account) => account.account_number !== victimAccount
  );
  const accountMap = new Map(
    relevantAccounts.map((account) => [account.account_number, account])
  );
  const mobileGroups = new Map();
  const deviceGroups = new Map();
  const ipGroups = new Map();
  const adjacency = new Map();
  const evidenceMap = new Map();

  function isUsefulValue(value) {
    const normalized = String(value || "").trim();
    return normalized && normalized !== "NA" && normalized !== "Unknown";
  }

  function pushGroup(groupMap, key, account) {
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key).push(account.account_number);
  }

  function connectAccounts(accountNumbers, reason) {
    accountNumbers.forEach((accountNumber) => {
      if (!adjacency.has(accountNumber)) {
        adjacency.set(accountNumber, new Set());
      }
      if (!evidenceMap.has(accountNumber)) {
        evidenceMap.set(accountNumber, []);
      }
    });

    accountNumbers.forEach((left, index) => {
      accountNumbers.slice(index + 1).forEach((right) => {
        adjacency.get(left).add(right);
        adjacency.get(right).add(left);
      });
      evidenceMap.get(left).push(reason);
    });
  }

  relevantAccounts.forEach((account) => {
    if (isUsefulValue(account.mobile_number)) {
      pushGroup(mobileGroups, account.mobile_number, account);
    }
    if (isUsefulValue(account.device_id)) {
      pushGroup(deviceGroups, account.device_id, account);
    }
    if (isUsefulValue(account.ip_address)) {
      pushGroup(ipGroups, account.ip_address, account);
    }
    if (!adjacency.has(account.account_number)) {
      adjacency.set(account.account_number, new Set());
    }
    if (!evidenceMap.has(account.account_number)) {
      evidenceMap.set(account.account_number, []);
    }
  });

  mobileGroups.forEach((members, mobile) => {
    if (members.length >= 2) {
      connectAccounts(members, `Same mobile number: ${mobile}`);
    }
  });

  deviceGroups.forEach((members, deviceId) => {
    if (members.length >= 2) {
      connectAccounts(members, `Same device ID: ${deviceId}`);
    }
  });

  ipGroups.forEach((members, ipAddress) => {
    if (members.length >= 2) {
      connectAccounts(members, `Same IP address: ${ipAddress}`);
    }
  });

  function formatIdentityGroups(groupMap, labelKey) {
    return Array.from(groupMap.entries())
      .filter(([, members]) => members.length >= 2)
      .map(([value, members]) => ({
        value,
        linked_accounts: members
          .map((accountNumber) => accountMap.get(accountNumber))
          .filter(Boolean)
          .sort((left, right) => right.risk_score - left.risk_score),
        count: members.length,
        type: labelKey,
      }))
      .sort((left, right) => right.count - left.count);
  }

  const sharedMobileGroups = formatIdentityGroups(mobileGroups, "mobile");
  const sharedDeviceGroups = formatIdentityGroups(deviceGroups, "device");
  const sharedIpGroups = formatIdentityGroups(ipGroups, "ip");

  const visited = new Set();
  const linkedClusters = [];

  relevantAccounts.forEach((account) => {
    if (visited.has(account.account_number)) {
      return;
    }

    const queue = [account.account_number];
    const component = [];
    visited.add(account.account_number);

    while (queue.length) {
      const current = queue.shift();
      component.push(current);

      (adjacency.get(current) || []).forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    if (component.length < 2) {
      return;
    }

    const members = component
      .map((accountNumber) => accountMap.get(accountNumber))
      .filter(Boolean)
      .sort(
        (left, right) =>
          right.risk_score - left.risk_score ||
          right.freeze_priority - left.freeze_priority
      );
    const combinedEvidence = [...new Set(
      component.flatMap((accountNumber) => evidenceMap.get(accountNumber) || [])
    )];

    linkedClusters.push({
      id: `identity-cluster-${String(linkedClusters.length + 1).padStart(2, "0")}`,
      label: "Possible Single Operator Cluster",
      members,
      member_count: members.length,
      average_risk_score: Math.round(
        members.reduce((sum, member) => sum + member.risk_score, 0) / members.length
      ),
      max_risk_score: Math.max(...members.map((member) => member.risk_score), 0),
      evidence: combinedEvidence.slice(0, 6),
      path_preview: members.map((member) => member.account_number).join(" -> "),
    });
  });

  const clusterByAccount = Object.fromEntries(
    linkedClusters.flatMap((cluster) =>
      cluster.members.map((member) => [member.account_number, cluster])
    )
  );

  return {
    sharedMobileGroups,
    sharedDeviceGroups,
    sharedIpGroups,
    linkedClusters: linkedClusters.sort(
      (left, right) =>
        right.member_count - left.member_count ||
        right.max_risk_score - left.max_risk_score
    ),
    clusterByAccount,
    summary: {
      linkedIdentityClusters: linkedClusters.length,
      sharedMobiles: sharedMobileGroups.length,
      sharedDevices: sharedDeviceGroups.length,
      sharedIps: sharedIpGroups.length,
    },
  };
}

function buildCrossBankNetworkMap({
  accounts,
  transactions,
  transactionPaths,
  victimAccount,
}) {
  const accountMap = new Map(accounts.map((account) => [account.account_number, account]));
  const institutionMap = new Map();
  const edgeMap = new Map();
  const pathMap = new Map();

  function ensureInstitution(bankName) {
    const name = bankName || "Unknown Institution";
    if (!institutionMap.has(name)) {
      institutionMap.set(name, {
        institution: name,
        accounts_involved: 0,
        total_balance: 0,
        suspicious_flow: 0,
        incoming_flow: 0,
        outgoing_flow: 0,
        frozen_accounts: 0,
        suspect_accounts: 0,
      });
    }
    return institutionMap.get(name);
  }

  accounts.forEach((account) => {
    const institution = ensureInstitution(account.bank_name);
    institution.accounts_involved += 1;
    institution.total_balance += account.current_balance || 0;
    if (account.account_status === "frozen") {
      institution.frozen_accounts += 1;
    }
    if (account.risk_score >= 35 || account.disputed_amount > 0) {
      institution.suspect_accounts += 1;
    }
  });

  transactions.forEach((transaction) => {
    const sender = accountMap.get(transaction.sender_account);
    const receiver = accountMap.get(transaction.receiver_account);
    const senderInstitution = sender?.bank_name || "Unknown Institution";
    const receiverInstitution = receiver?.bank_name || "Unknown Institution";

    ensureInstitution(senderInstitution).outgoing_flow += transaction.amount;
    ensureInstitution(receiverInstitution).incoming_flow += transaction.amount;

    if (senderInstitution === receiverInstitution) {
      return;
    }

    const edgeKey = `${senderInstitution}-->${receiverInstitution}`;
    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, {
        from: senderInstitution,
        to: receiverInstitution,
        total_amount: 0,
        transfer_count: 0,
        suspicious_count: 0,
        sample_references: [],
      });
    }

    const edge = edgeMap.get(edgeKey);
    edge.total_amount += transaction.amount;
    edge.transfer_count += 1;
    edge.suspicious_count += transaction.is_suspicious ? 1 : 0;
    if (edge.sample_references.length < 3) {
      edge.sample_references.push(transaction.reference_id);
    }

    if (transaction.is_suspicious) {
      ensureInstitution(senderInstitution).suspicious_flow += transaction.amount;
      ensureInstitution(receiverInstitution).suspicious_flow += transaction.amount;
    }
  });

  transactionPaths.forEach((path, index) => {
    if (!path.length) {
      return;
    }

    const institutions = [];
    const firstSenderInstitution =
      accountMap.get(path[0].sender_account)?.bank_name || "Unknown Institution";
    institutions.push(firstSenderInstitution);

    path.forEach((transaction) => {
      const receiverInstitution =
        accountMap.get(transaction.receiver_account)?.bank_name || "Unknown Institution";
      if (institutions[institutions.length - 1] !== receiverInstitution) {
        institutions.push(receiverInstitution);
      }
    });

    const compressedInstitutions = institutions.filter(
      (institution, pathIndex) => institution !== institutions[pathIndex - 1]
    );

    if (compressedInstitutions.length < 2) {
      return;
    }

    const pathKey = compressedInstitutions.join(" -> ");
    if (!pathMap.has(pathKey)) {
      pathMap.set(pathKey, {
        id: `bank-path-${index + 1}`,
        institutions: compressedInstitutions,
        path_preview: pathKey,
        total_amount: 0,
        transaction_count: 0,
        victim_origin:
          path[0].sender_account === victimAccount ||
          compressedInstitutions[0] ===
            (accountMap.get(victimAccount)?.bank_name || "Unknown Institution"),
      });
    }

    const mappedPath = pathMap.get(pathKey);
    mappedPath.total_amount += path.reduce((sum, transaction) => sum + transaction.amount, 0);
    mappedPath.transaction_count += path.length;
  });

  const institutions = Array.from(institutionMap.values())
    .map((institution) => ({
      ...institution,
      total_balance: round(institution.total_balance),
      suspicious_flow: round(institution.suspicious_flow),
      incoming_flow: round(institution.incoming_flow),
      outgoing_flow: round(institution.outgoing_flow),
    }))
    .sort((left, right) => right.suspicious_flow - left.suspicious_flow || right.outgoing_flow - left.outgoing_flow);

  const edges = Array.from(edgeMap.values())
    .map((edge) => ({
      ...edge,
      total_amount: round(edge.total_amount),
    }))
    .sort((left, right) => right.total_amount - left.total_amount);

  const chainPreviews = Array.from(pathMap.values())
    .map((path) => ({
      ...path,
      total_amount: round(path.total_amount),
    }))
    .sort((left, right) => right.total_amount - left.total_amount || right.transaction_count - left.transaction_count)
    .slice(0, 8);

  const highestRiskEdge = edges[0] || null;

  return {
    institutions,
    edges,
    chainPreviews,
    summary: {
      institutionCount: institutions.length,
      edgeCount: edges.length,
      totalCrossBankAmount: round(edges.reduce((sum, edge) => sum + edge.total_amount, 0)),
      highestRiskEdge,
    },
  };
}

function buildFraudSpeedDetections({
  accounts,
  statsMap,
  victimAccount,
}) {
  const detections = accounts
    .filter((account) => account.account_number !== victimAccount)
    .map((account) => {
      const stats = statsMap.get(account.account_number);
      const timeline = [...(stats?.incoming || []), ...(stats?.outgoing || [])]
        .map((transaction) => ({
          ...transaction,
          _time: safeDate(transaction.timestamp),
        }))
        .filter((transaction) => transaction._time)
        .sort((left, right) => left._time - right._time);

      if (!timeline.length) {
        return null;
      }

      let bestWindow = {
        transferCount: 1,
        totalAmount: timeline[0].amount,
        start: timeline[0]._time,
        end: timeline[0]._time,
      };

      for (let startIndex = 0; startIndex < timeline.length; startIndex += 1) {
        const startTransaction = timeline[startIndex];
        let transferCount = 1;
        let totalAmount = startTransaction.amount;
        let endTime = startTransaction._time;

        for (let cursor = startIndex + 1; cursor < timeline.length; cursor += 1) {
          const currentTransaction = timeline[cursor];
          if (minutesBetween(startTransaction._time, currentTransaction._time) <= 2) {
            transferCount += 1;
            totalAmount += currentTransaction.amount;
            endTime = currentTransaction._time;
          } else {
            break;
          }
        }

        if (
          transferCount > bestWindow.transferCount ||
          (transferCount === bestWindow.transferCount && totalAmount > bestWindow.totalAmount)
        ) {
          bestWindow = {
            transferCount,
            totalAmount: round(totalAmount),
            start: startTransaction._time,
            end: endTime,
          };
        }
      }

      const windowMinutes = Math.max(1, round(minutesBetween(bestWindow.start, bestWindow.end)));
      const confidence = Math.round(
        clamp(
          bestWindow.transferCount * 18 +
            (bestWindow.totalAmount / Math.max((stats?.incomingTotal || 0) + (stats?.outgoingTotal || 0), 1)) * 28 +
            (stats?.recentBurst ? 18 : 0) +
            (stats?.rapidSplit ? 16 : 0) +
            account.risk_score * 0.18,
          0,
          99
        )
      );

      if (
        bestWindow.transferCount < 2 ||
        (bestWindow.transferCount < 3 && bestWindow.totalAmount < 10000)
      ) {
        return null;
      }

      return {
        account_number: account.account_number,
        account_holder_name: account.account_holder_name,
        bank_name: account.bank_name,
        transfer_count: bestWindow.transferCount,
        window_minutes: windowMinutes,
        total_amount: round(bestWindow.totalAmount),
        confidence,
        status:
          bestWindow.transferCount >= 4 || bestWindow.totalAmount >= 25000
            ? "Abnormal Speed Detected"
            : "Watch Speed Burst",
        description: `${account.account_number} made ${bestWindow.transferCount} transfers in ${windowMinutes} minute(s), moving ${formatCurrency(bestWindow.totalAmount)}.`,
        reasons: [
          `${bestWindow.transferCount} transfers clustered inside a ${windowMinutes}-minute window.`,
          `Total amount moved in that burst: ${formatCurrency(bestWindow.totalAmount)}.`,
          stats?.rapidSplit
            ? "Rapid split behavior overlaps with this speed burst."
            : "Speed pattern is abnormal for a normal recipient account.",
        ],
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.transfer_count - left.transfer_count ||
        right.total_amount - left.total_amount
    );

  return {
    detections,
    topDetection: detections[0] || null,
    summary: detections.length
      ? `${detections.length} account(s) show abnormal fraud speed.`
      : "No abnormal speed burst is strong enough yet.",
  };
}

function buildPreWithdrawalFraudLock({
  accounts,
  statsMap,
  victimAccount,
  latestTransactionTime,
  rootAmount,
  muleDetector,
  fraudSpeedDetection,
  nextTransferPredictions,
  networkByAccount,
}) {
  const muleDetections = new Map(
    (muleDetector?.muleAccountDetections || []).map((account) => [
      account.account_number,
      account,
    ])
  );
  const speedDetections = new Map(
    (fraudSpeedDetection?.detections || []).map((detection) => [
      detection.account_number,
      detection,
    ])
  );
  const predictedReceivers = new Map(
    (nextTransferPredictions || []).map((prediction) => [
      prediction.account_number,
      prediction,
    ])
  );

  const emergencyFreezeTargets = accounts
    .filter(
      (account) =>
        account.account_number !== victimAccount &&
        account.account_status !== "frozen" &&
        account.disputed_amount > 0
    )
    .map((account) => {
      const stats = statsMap.get(account.account_number);
      const muleSignal = muleDetections.get(account.account_number);
      const speedSignal = speedDetections.get(account.account_number);
      const predictionSignal = predictedReceivers.get(account.account_number);
      const linkedNetwork = networkByAccount?.[account.account_number];
      const incomingTransactions = stats?.incoming || [];
      const outgoingTransactions = stats?.outgoing || [];

      if (!stats || !incomingTransactions.length) {
        return null;
      }

      const latestIncoming = incomingTransactions[incomingTransactions.length - 1];
      const latestIncomingTime = safeDate(latestIncoming.timestamp);
      const minutesSinceLatestIncoming = round(
        minutesBetween(latestIncomingTime, latestTransactionTime)
      );

      let quickCashoutSignals = 0;
      let shortestObservedDelay = Number.POSITIVE_INFINITY;
      let totalObservedDelay = 0;
      let observedDelayCount = 0;

      incomingTransactions.forEach((incomingTransaction) => {
        const incomingTime = safeDate(incomingTransaction.timestamp);
        const followUpCashouts = outgoingTransactions
          .map((outgoingTransaction) => ({
            ...outgoingTransaction,
            _time: safeDate(outgoingTransaction.timestamp),
          }))
          .filter(
            (outgoingTransaction) =>
              outgoingTransaction._time &&
              incomingTime &&
              outgoingTransaction._time >= incomingTime &&
              minutesBetween(incomingTime, outgoingTransaction._time) <= 45
          )
          .sort((left, right) => left._time - right._time);

        if (!followUpCashouts.length) {
          return;
        }

        quickCashoutSignals += 1;
        const firstCashoutDelay = minutesBetween(
          incomingTime,
          followUpCashouts[0]._time
        );
        shortestObservedDelay = Math.min(shortestObservedDelay, firstCashoutDelay);
        totalObservedDelay += firstCashoutDelay;
        observedDelayCount += 1;
      });

      const historicalCashoutScore = clamp(
        quickCashoutSignals * 24 +
          (outgoingTransactions.length && incomingTransactions.length
            ? (outgoingTransactions.length / incomingTransactions.length) * 26
            : 0),
        0,
        100
      );
      const muleScore =
        muleSignal?.confidence ||
        (account.classification === "mule"
          ? 64
          : account.classification === "cashout"
            ? 58
            : 0);
      const speedScore = speedSignal?.confidence || 0;
      const recencyScore =
        minutesSinceLatestIncoming <= 5
          ? 100
          : minutesSinceLatestIncoming <= 15
            ? 84
            : minutesSinceLatestIncoming <= 30
              ? 68
              : minutesSinceLatestIncoming <= 60
                ? 45
                : 18;
      const liquidityScore = clamp(
        (account.disputed_amount / Math.max(rootAmount || 1, 1)) * 230,
        0,
        100
      );
      const balanceRetentionScore = clamp(
        (account.disputed_amount / Math.max(stats.incomingTotal || 1, 1)) * 100,
        0,
        100
      );
      const networkScore = linkedNetwork
        ? clamp(
            linkedNetwork.member_count * 12 +
              linkedNetwork.highest_risk_score * 0.5,
            0,
            100
          )
        : 0;
      const roleScore =
        account.classification === "cashout"
          ? 92
          : account.classification === "mule"
            ? 78
            : account.classification === "splitter"
              ? 52
              : account.risk_score;
      const predictionOverlapScore = predictionSignal
        ? clamp(predictionSignal.probability * 0.45, 0, 32)
        : 0;
      const dormantCashoutBoost =
        outgoingTransactions.length === 0 && account.disputed_amount >= 5000 ? 18 : 0;

      const withdrawalRisk = Math.round(
        clamp(
          muleScore * 0.2 +
            historicalCashoutScore * 0.18 +
            speedScore * 0.16 +
            recencyScore * 0.14 +
            liquidityScore * 0.1 +
            balanceRetentionScore * 0.08 +
            networkScore * 0.06 +
            roleScore * 0.08 +
            predictionOverlapScore +
            dormantCashoutBoost -
            (account.trust_score >= 80 ? 22 : account.trust_score >= 65 ? 10 : 0) -
            (account.is_verified_legitimate ? 16 : 0),
          0,
          99
        )
      );

      const shouldEscalate =
        withdrawalRisk >= 62 ||
        quickCashoutSignals >= 1 ||
        (muleScore >= 65 && minutesSinceLatestIncoming <= 30) ||
        (speedScore >= 70 && account.disputed_amount >= 5000);

      if (!shouldEscalate) {
        return null;
      }

      const predictedWithdrawalWindowMinutes = Number.isFinite(shortestObservedDelay)
        ? clamp(Math.round(shortestObservedDelay), 2, 45)
        : withdrawalRisk >= 85
          ? 5
          : withdrawalRisk >= 72
            ? 10
            : 20;
      const averageObservedDelay = observedDelayCount
        ? round(totalObservedDelay / observedDelayCount)
        : null;
      const recommendedAction =
        withdrawalRisk >= 80
          ? "Emergency freeze now"
          : withdrawalRisk >= 68
            ? "Freeze before next withdrawal window"
            : "Urgent watch and prepare freeze request";

      const reasons = [
        `Latest suspicious inflow reached this account ${minutesSinceLatestIncoming} minute(s) before the latest trail event.`,
      ];

      if (muleSignal) {
        reasons.push(
          `Mule detector confidence is ${muleSignal.confidence}% with ${muleSignal.fast_cashout_instances} fast cashout signal(s).`
        );
      }
      if (speedSignal) {
        reasons.push(
          `Fraud speed detector already flagged ${speedSignal.transfer_count} transfers in ${speedSignal.window_minutes} minute(s).`
        );
      }
      if (quickCashoutSignals) {
        reasons.push(
          `Historical cashout behavior appeared ${quickCashoutSignals} time(s); shortest observed delay was ${Math.round(shortestObservedDelay)} minute(s).`
        );
      }
      if (predictionSignal) {
        reasons.push(
          `Prediction model already treats this account as a likely next suspicious receiver at ${predictionSignal.probability}% probability.`
        );
      }
      if (linkedNetwork) {
        reasons.push(
          `Account belongs to ${linkedNetwork.name} with ${linkedNetwork.member_count} linked member(s).`
        );
      }
      if (!outgoingTransactions.length) {
        reasons.push("Funds are currently parked here, increasing the chance of an imminent withdrawal attempt.");
      }

      return {
        account_number: account.account_number,
        account_holder_name: account.account_holder_name,
        bank_name: account.bank_name,
        disputed_amount: round(account.disputed_amount),
        withdrawal_risk: withdrawalRisk,
        predicted_withdrawal_window_minutes: predictedWithdrawalWindowMinutes,
        average_observed_delay_minutes: averageObservedDelay,
        quick_cashout_signals: quickCashoutSignals,
        latest_incoming_amount: round(latestIncoming.amount),
        latest_incoming_timestamp: latestIncoming.timestamp,
        recommended_action: recommendedAction,
        status:
          withdrawalRisk >= 80
            ? "Emergency Freeze Alert"
            : "Pre-Withdrawal Watch",
        likely_network: linkedNetwork?.name || null,
        reasons,
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.withdrawal_risk - left.withdrawal_risk ||
        right.disputed_amount - left.disputed_amount
    )
    .slice(0, 8);

  return {
    emergencyFreezeTargets,
    topTarget: emergencyFreezeTargets[0] || null,
    summary: emergencyFreezeTargets.length
      ? `${emergencyFreezeTargets.length} account(s) look vulnerable to imminent withdrawal and should be reviewed for emergency freeze.`
      : "No account currently crosses the emergency withdrawal-risk threshold.",
  };
}

function buildDigitalCriminalTwin({
  accounts,
  statsMap,
  transactions,
  victimAccount,
  criminalNetworks,
  identityLinkDetection,
  behaviorFingerprint,
  fraudSpeedDetection,
  preWithdrawalFraudLock,
}) {
  const relevantAccounts = accounts.filter((account) => {
    const stats = statsMap.get(account.account_number);
    return (
      account.account_number !== victimAccount &&
      stats &&
      (
        account.risk_score >= 35 ||
        account.disputed_amount > 0 ||
        account.freeze_priority >= 4 ||
        ["mastermind", "splitter", "mule", "cashout"].includes(account.classification) ||
        stats.rapidSplit ||
        stats.recentBurst
      )
    );
  });
  const relevantSet = new Set(relevantAccounts.map((account) => account.account_number));
  const accountMap = new Map(accounts.map((account) => [account.account_number, account]));
  const speedMap = new Map(
    (fraudSpeedDetection?.detections || []).map((detection) => [
      detection.account_number,
      detection,
    ])
  );
  const emergencyMap = new Map(
    (preWithdrawalFraudLock?.emergencyFreezeTargets || []).map((target) => [
      target.account_number,
      target,
    ])
  );
  const adjacency = new Map();
  const evidenceMap = new Map();

  relevantAccounts.forEach((account) => {
    adjacency.set(account.account_number, new Set());
    evidenceMap.set(account.account_number, []);
  });

  function addEvidence(accountNumber, reason) {
    if (!evidenceMap.has(accountNumber)) {
      evidenceMap.set(accountNumber, []);
    }
    evidenceMap.get(accountNumber).push(reason);
  }

  function connectAccounts(accountNumbers, reason) {
    const filtered = [...new Set(accountNumbers)].filter((accountNumber) =>
      relevantSet.has(accountNumber)
    );

    if (filtered.length < 2) {
      return;
    }

    filtered.forEach((accountNumber) => addEvidence(accountNumber, reason));
    filtered.forEach((left, index) => {
      filtered.slice(index + 1).forEach((right) => {
        adjacency.get(left)?.add(right);
        adjacency.get(right)?.add(left);
      });
    });
  }

  criminalNetworks.forEach((network) => {
    connectAccounts(
      network.account_numbers,
      `${network.name} links these accounts through direct suspicious fund movement.`
    );
  });

  (identityLinkDetection?.linkedClusters || []).forEach((cluster) => {
    connectAccounts(
      cluster.members.map((member) => member.account_number),
      `${cluster.label} ties these accounts through shared identity signals.`
    );
  });

  const locationGroups = new Map();
  relevantAccounts.forEach((account) => {
    const location = String(account.location || "").trim();
    if (!location || location === "Unknown") {
      return;
    }
    if (!locationGroups.has(location)) {
      locationGroups.set(location, []);
    }
    locationGroups.get(location).push(account.account_number);
  });

  locationGroups.forEach((members, location) => {
    if (members.length >= 2) {
      connectAccounts(
        members,
        `Repeated activity appears from the same location cluster: ${location}.`
      );
    }
  });

  const timelineByAccount = new Map();
  relevantAccounts.forEach((account) => {
    const stats = statsMap.get(account.account_number);
    const timeline = [...(stats?.incoming || []), ...(stats?.outgoing || [])]
      .map((transaction) => safeDate(transaction.timestamp))
      .filter(Boolean)
      .sort((left, right) => left - right);
    timelineByAccount.set(account.account_number, timeline);
  });

  const relevantList = relevantAccounts.map((account) => account.account_number);
  for (let index = 0; index < relevantList.length; index += 1) {
    for (let cursor = index + 1; cursor < relevantList.length; cursor += 1) {
      const left = relevantList[index];
      const right = relevantList[cursor];
      const leftTimeline = timelineByAccount.get(left) || [];
      const rightTimeline = timelineByAccount.get(right) || [];
      let overlaps = 0;

      leftTimeline.forEach((leftTime) => {
        const hasMatch = rightTimeline.some(
          (rightTime) => minutesBetween(leftTime, rightTime) <= 5
        );
        if (hasMatch) {
          overlaps += 1;
        }
      });

      if (overlaps >= 2) {
        connectAccounts(
          [left, right],
          `Transaction timing is coordinated with ${overlaps} overlap(s) inside a 5-minute window.`
        );
      }
    }
  }

  const visited = new Set();
  const profiles = [];

  relevantAccounts.forEach((account) => {
    if (visited.has(account.account_number)) {
      return;
    }

    const queue = [account.account_number];
    const component = [];
    visited.add(account.account_number);

    while (queue.length) {
      const current = queue.shift();
      component.push(current);

      (adjacency.get(current) || []).forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    if (component.length < 2) {
      return;
    }

    const members = component
      .map((accountNumber) => accountMap.get(accountNumber))
      .filter(Boolean)
      .sort(
        (left, right) =>
          right.risk_score - left.risk_score ||
          right.freeze_priority - left.freeze_priority
      );
    const memberSet = new Set(members.map((member) => member.account_number));
    const memberTransactions = transactions.filter(
      (transaction) =>
        memberSet.has(transaction.sender_account) || memberSet.has(transaction.receiver_account)
    );
    const devices = [...new Set(members.map((member) => member.device_id).filter(Boolean))];
    const ips = [...new Set(members.map((member) => member.ip_address).filter(Boolean))];
    const mobiles = [...new Set(members.map((member) => member.mobile_number).filter(Boolean))];
    const locations = [...new Set(members.map((member) => member.location).filter(Boolean))];
    const connectedNetworks = [...new Set(
      members
        .map((member) =>
          criminalNetworks.find((network) =>
            network.account_numbers.includes(member.account_number)
          )?.name
        )
        .filter(Boolean)
    )];
    const emergencyTargets = members.filter((member) =>
      emergencyMap.has(member.account_number)
    );
    const speedTargets = members.filter((member) => speedMap.has(member.account_number));
    const averageRisk = Math.round(
      members.reduce((sum, member) => sum + member.risk_score, 0) / members.length
    );
    const leader =
      members.find((member) => member.classification === "mastermind") ||
      members.find((member) => member.classification === "splitter") ||
      members[0];
    const sharedSignalScore = clamp(
      (devices.length ? 28 : 0) +
        (ips.length ? 24 : 0),
      0,
      100
    );
    const mobileScore = mobiles.length ? 18 : 0;
    const timingScore = clamp(speedTargets.length * 18 + emergencyTargets.length * 16, 0, 100);
    const networkScore = clamp(connectedNetworks.length * 22 + members.length * 8, 0, 100);
    const locationScore = clamp(
      !locations.length
        ? 0
        : locations.length <= 2
          ? 16
          : locations.length === 3
            ? 10
            : 4,
      0,
      16
    );
    const confidence = Math.round(
      clamp(
        averageRisk * 0.3 +
          sharedSignalScore * 0.2 +
          mobileScore * 0.08 +
          timingScore * 0.16 +
          networkScore * 0.16 +
          locationScore * 0.05 +
          ((behaviorFingerprint?.confidence || 0) * 0.05),
        0,
        98
      )
    );
    const evidence = [...new Set(
      component.flatMap((accountNumber) => evidenceMap.get(accountNumber) || [])
    )].slice(0, 8);
    const suspiciousHours = memberTransactions.filter((transaction) => {
      const hour = safeDate(transaction.timestamp)?.getHours();
      return hour >= 22 || hour <= 5;
    }).length;
    const timingSignature = [
      speedTargets.length ? "burst timing" : null,
      emergencyTargets.length ? "withdrawal urgency" : null,
      suspiciousHours >= 2 ? "night activity" : null,
    ].filter(Boolean);

    profiles.push({
      id: `criminal-twin-${String(profiles.length + 1).padStart(2, "0")}`,
      name: `Digital Criminal Twin ${profiles.length + 1}`,
      label: "Possible Fraud Mastermind",
      confidence,
      suspected_controller: leader,
      controlled_accounts: members,
      controlled_account_numbers: members.map((member) => member.account_number),
      member_count: members.length,
      average_risk_score: averageRisk,
      fraud_type: behaviorFingerprint?.fraudType || "Coordinated Fraud Network",
      device_fingerprints: devices.slice(0, 4),
      ip_addresses: ips.slice(0, 4),
      mobile_numbers: mobiles.slice(0, 4),
      locations: locations.slice(0, 4),
      linked_networks: connectedNetworks,
      timing_signature: timingSignature.length
        ? timingSignature.join(" + ")
        : "coordinated routing",
      evidence,
      recommendation:
        confidence >= 80
          ? "Treat this profile as a likely mastermind cluster and freeze controller-linked accounts first."
          : "Keep this cluster under close watch and verify shared-control evidence quickly.",
    });
  });

  const sortedProfiles = profiles.sort(
    (left, right) =>
      right.confidence - left.confidence ||
      right.member_count - left.member_count ||
      right.average_risk_score - left.average_risk_score
  );
  const twinByAccount = Object.fromEntries(
    sortedProfiles.flatMap((profile) =>
      profile.controlled_account_numbers.map((accountNumber) => [accountNumber, profile])
    )
  );

  return {
    profiles: sortedProfiles,
    topProfile: sortedProfiles[0] || null,
    twinByAccount,
    summary: sortedProfiles.length
      ? `${sortedProfiles.length} possible mastermind profile(s) detected from shared control behavior.`
      : "No mastermind cluster is strong enough yet.",
  };
}

function buildGeneratedAlerts(
  accounts,
  statsMap,
  transactions,
  chainDepths,
  speedDetections = [],
  emergencyFreezeTargets = []
) {
  const alerts = [];
  const accountList = Array.from(accounts.values ? accounts.values() : accounts);
  const deviceGroups = new Map();
  const ipGroups = new Map();

  accountList.forEach((account) => {
    if (account.device_id) {
      if (!deviceGroups.has(account.device_id)) {
        deviceGroups.set(account.device_id, []);
      }
      deviceGroups.get(account.device_id).push(account);
    }

    if (account.ip_address) {
      if (!ipGroups.has(account.ip_address)) {
        ipGroups.set(account.ip_address, []);
      }
      ipGroups.get(account.ip_address).push(account);
    }
  });

  accountList.forEach((account) => {
    const stats = statsMap.get(account.account_number);
    const accountDepth = chainDepths.get(account.account_number) || 0;
    const accountAgeDays = Math.floor(
      (new Date().getTime() - new Date(account.account_creation_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (stats?.rapidSplit) {
      alerts.push({
        id: `rapid_transfer:${account.account_number}`,
        alert_type: "rapid_transfer",
        severity: "critical",
        account_number: account.account_number,
        description: `${account.account_number} split funds across ${stats.receivers.size} accounts within 15 minutes of receipt.`,
      });
    }

    if (stats?.recentBurst) {
      alerts.push({
        id: `high_velocity:${account.account_number}`,
        alert_type: "high_velocity",
        severity: "high",
        account_number: account.account_number,
        description: `${account.account_number} shows a high-velocity burst with ${stats.incoming.length + stats.outgoing.length} transactions clustered in 10 minutes.`,
      });
    }

    if (accountDepth >= 4) {
      alerts.push({
        id: `deep_chain:${account.account_number}`,
        alert_type: "deep_chain",
        severity: "medium",
        account_number: account.account_number,
        description: `${account.account_number} appears at chain depth ${accountDepth}, making the trail harder to unwind.`,
      });
    }

    if (accountAgeDays <= 30 && (account.risk_score || 0) >= 60) {
      alerts.push({
        id: `new_account:${account.account_number}`,
        alert_type: "new_account",
        severity: "high",
        account_number: account.account_number,
        description: `${account.account_number} is only ${accountAgeDays} days old and is already participating in suspicious movement.`,
      });
    }

    if (!stats?.outgoing.length && stats?.incomingTotal >= 10000) {
      alerts.push({
        id: `large_cashout:${account.account_number}`,
        alert_type: "large_cashout",
        severity: "critical",
        account_number: account.account_number,
        description: `${account.account_number} received ${formatCurrency(stats.incomingTotal)} and currently behaves like a cashout endpoint.`,
      });
    }
  });

  deviceGroups.forEach((members, deviceId) => {
    if (members.length >= 2) {
      members.forEach((account) => {
        alerts.push({
          id: `shared_device:${account.account_number}:${deviceId}`,
          alert_type: "shared_device",
          severity: "high",
          account_number: account.account_number,
          description: `${account.account_number} shares device ${deviceId} with ${members.length - 1} other linked account(s).`,
        });
      });
    }
  });

  ipGroups.forEach((members, ipAddress) => {
    if (members.length >= 2) {
      members.forEach((account) => {
        alerts.push({
          id: `multi_location:${account.account_number}:${ipAddress}`,
          alert_type: "multi_location",
          severity: "medium",
          account_number: account.account_number,
          description: `${account.account_number} shares IP ${ipAddress} with ${members.length - 1} other linked account(s).`,
        });
      });
    }
  });

  speedDetections.forEach((detection) => {
    alerts.push({
      id: `abnormal_speed:${detection.account_number}`,
      alert_type: "abnormal_speed",
      severity:
        detection.transfer_count >= 4 || detection.total_amount >= 25000
          ? "critical"
          : "high",
      account_number: detection.account_number,
      description: detection.description,
    });
  });

  emergencyFreezeTargets.slice(0, 4).forEach((target) => {
    alerts.push({
      id: `emergency_freeze:${target.account_number}`,
      alert_type: "emergency_freeze",
      severity: "critical",
      account_number: target.account_number,
      description: `${target.account_number} may attempt withdrawal within ${target.predicted_withdrawal_window_minutes} minute(s). Freeze now to hold ${formatCurrency(target.disputed_amount)}.`,
    });
  });

  return alerts.map((alert, index) => ({
    case_id: transactions[0]?.case_id || "",
    is_read: false,
    action_taken: "none",
    ...alert,
    _sequence: index,
  }));
}

export function buildInvestigationAnalytics({
  accounts = [],
  transactions = [],
  caseData = {},
  reviews = {},
}) {
  const normalizedTransactions = [...transactions]
    .map((transaction, index) => ({
      transaction_id: transaction.transaction_id || `TXN-${String(index + 1).padStart(4, "0")}`,
      sender_account: transaction.sender_account,
      receiver_account: transaction.receiver_account,
      amount: toNumber(transaction.amount),
      timestamp: safeIso(transaction.timestamp),
      transaction_type: transaction.transaction_type || "IMPS",
      transaction_status: transaction.transaction_status || "success",
      reference_id: transaction.reference_id || `REF-${index + 1}`,
      case_id: transaction.case_id || caseData.complaint_id || "",
      is_suspicious: Boolean(transaction.is_suspicious),
      flag_reason: transaction.flag_reason || "",
      sender_name: transaction.sender_name,
      receiver_name: transaction.receiver_name,
      sender_bank: transaction.sender_bank,
      receiver_bank: transaction.receiver_bank,
      sender_device: transaction.sender_device,
      receiver_device: transaction.receiver_device,
      sender_ip: transaction.sender_ip,
      receiver_ip: transaction.receiver_ip,
      sender_location: transaction.sender_location,
      receiver_location: transaction.receiver_location,
    }))
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

  const accountMap = buildAccountMap(accounts, normalizedTransactions);
  const statsMap = buildTransactionStats(accountMap, normalizedTransactions);
  const { depths, victimAccount } = computeChainDepths(caseData, normalizedTransactions);
  const taintedBalances = computeTaintedBalances({ ...caseData, victim_account: victimAccount }, normalizedTransactions);
  const latestTransactionTime = normalizedTransactions.length
    ? safeDate(normalizedTransactions[normalizedTransactions.length - 1].timestamp)
    : new Date();

  const enrichedAccounts = Array.from(accountMap.values()).map((account) => {
    const stats = statsMap.get(account.account_number);
    const review = getReviewState(reviews, account.account_number);
    const accountAgeDays = Math.max(
      1,
      Math.floor(
        (latestTransactionTime.getTime() - new Date(account.account_creation_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const txCount = stats.incoming.length + stats.outgoing.length;
    const velocity = round(txCount / hoursBetween(stats.firstSeen, stats.lastSeen));
    const fragmentationIndex = clamp((stats.outgoing.length - 1) * 16 + stats.receivers.size * 10, 0, 100);
    const velocityIndex = clamp(velocity * 8, 0, 100);
    const outDegreeIndex = clamp(stats.receivers.size * 20, 0, 100);
    const ageIndex = clamp(accountAgeDays <= 30 ? 100 : accountAgeDays <= 90 ? 65 : accountAgeDays <= 180 ? 35 : 10, 0, 100);
    const chainIndex = clamp((depths.get(account.account_number) || 0) * 18, 0, 100);
    const flagsIndex = clamp(
      (stats.rapidSplit ? 45 : 0) +
        (stats.recentBurst ? 30 : 0) +
        (stats.outgoing.length === 0 && stats.incomingTotal >= 10000 ? 15 : 0),
      0,
      100
    );

    const riskScore = clamp(
      velocityIndex * 0.22 +
        fragmentationIndex * 0.22 +
        outDegreeIndex * 0.15 +
        ageIndex * 0.14 +
        chainIndex * 0.12 +
        flagsIndex * 0.15
    );

    const disputedAmount = Math.min(account.current_balance || 0, taintedBalances.get(account.account_number) || 0);
    const releaseableAmount = Math.max(
      0,
      (account.current_balance || 0) - disputedAmount - (review.releasedAmount || 0)
    );

    const legitimacyScore = clamp(
      (accountAgeDays > 365 ? 28 : accountAgeDays > 180 ? 18 : 6) +
        (stats.incoming.length === 1 ? 18 : stats.incoming.length <= 3 ? 10 : 2) +
        (stats.outgoing.length === 0 ? 22 : stats.outgoing.length === 1 ? 12 : 0) +
        (review.documents.length ? 12 : 0) +
        (review.verified ? 18 : 0) +
        (releaseableAmount > 0 ? 10 : 0) -
        (riskScore * 0.35) -
        (stats.rapidSplit ? 22 : 0) -
        (stats.recentBurst ? 18 : 0)
    );

    const recommendedClassification =
      account.account_number === victimAccount
        ? "victim"
        : legitimacyScore >= 72
          ? "innocent"
          : stats.rapidSplit
            ? "splitter"
            : (depths.get(account.account_number) || 0) === 1 && stats.outgoing.length >= 1
              ? "mastermind"
              : stats.outgoing.length === 0 && disputedAmount > 0
                ? "cashout"
                : (depths.get(account.account_number) || 0) >= 2
                  ? "mule"
                  : account.classification || DEFAULT_CLASSIFICATION;

    const freezePriority = clamp(
      Math.round(
        (riskScore * 0.55 + disputedAmount / Math.max(caseData.fraud_amount || 1, 1) * 100 * 0.45) / 10
      ),
      0,
      10
    );

    const explanations = [];
    if (stats.rapidSplit) {
      explanations.push("Rapid split detected within 15 minutes of incoming funds.");
    }
    if (stats.recentBurst) {
      explanations.push("High-velocity burst detected in a 10-minute window.");
    }
    if (stats.receivers.size >= 2) {
      explanations.push(`Funds fragmented to ${stats.receivers.size} downstream account(s).`);
    }
    if (accountAgeDays <= 30) {
      explanations.push("Account is recently opened.");
    }
    if (legitimacyScore >= 70) {
      explanations.push("Legitimacy indicators suggest the account may be an innocent recipient.");
    }
    if (review.documents.length) {
      explanations.push(`${review.documents.length} supporting document(s) uploaded.`);
    }
    if (review.verified) {
      explanations.push("Officer has verified the account review.");
    }

    return {
      ...account,
      classification: account.classification || recommendedClassification,
      recommended_classification: recommendedClassification,
      chain_depth_level: depths.get(account.account_number) || 0,
      transaction_velocity: velocity,
      freeze_priority: freezePriority,
      risk_score: Math.round(riskScore),
      trust_score: Math.round(legitimacyScore),
      stats: {
        incoming_count: stats.incoming.length,
        outgoing_count: stats.outgoing.length,
        incoming_total: round(stats.incomingTotal),
        outgoing_total: round(stats.outgoingTotal),
        out_degree: stats.receivers.size,
        in_degree: stats.senders.size,
        account_age_days: accountAgeDays,
        rapid_split: stats.rapidSplit,
        high_velocity: stats.recentBurst,
      },
      disputed_amount: round(disputedAmount),
      releaseable_amount: round(releaseableAmount),
      released_amount: round(review.releasedAmount || 0),
      supporting_documents: review.documents,
      is_verified_legitimate: review.verified,
      explanation: explanations,
    };
  });

  const accountsByNumber = Object.fromEntries(
    enrichedAccounts.map((account) => [account.account_number, account])
  );
  const transactionPaths = buildTransactionPaths(
    { ...caseData, victim_account: victimAccount },
    normalizedTransactions
  );

  const rootAmount = normalizedTransactions
    .filter((transaction) => transaction.sender_account === victimAccount)
    .reduce((sum, transaction) => sum + transaction.amount, 0) || caseData.fraud_amount || 0;

  const immediateFreeze = [...enrichedAccounts]
    .filter((account) => account.account_number !== victimAccount && account.risk_score >= 65 && account.disputed_amount > 0)
    .sort((left, right) => right.freeze_priority - left.freeze_priority || right.risk_score - left.risk_score);

  const reviewAccounts = [...enrichedAccounts]
    .filter((account) => account.account_number !== victimAccount && (account.trust_score >= 65 || account.supporting_documents.length || account.is_verified_legitimate))
    .sort((left, right) => right.trust_score - left.trust_score);

  const releasedToInnocent = enrichedAccounts.reduce((sum, account) => sum + (account.released_amount || 0), 0);
  const disputedHeld = enrichedAccounts
    .filter((account) => account.account_status === "frozen")
    .reduce((sum, account) => sum + Math.max(0, account.disputed_amount - (account.released_amount || 0)), 0);
  const amountRecovered = caseData.recovered_amount || 0;
  const amountStillMoving = Math.max(0, rootAmount - amountRecovered - disputedHeld - releasedToInnocent);
  const securedPercentage = rootAmount ? clamp(((amountRecovered + disputedHeld) / rootAmount) * 100, 0, 100) : 0;
  const { nextTransferPredictions, nextTransferBySource } = buildNextTransferPredictions({
    accounts: enrichedAccounts,
    statsMap,
    transactions: normalizedTransactions,
    victimAccount,
    rootAmount,
  });
  const { criminalNetworks, networkByAccount } = buildCriminalNetworks({
    accounts: enrichedAccounts,
    statsMap,
    transactions: normalizedTransactions,
    victimAccount,
  });
  const recoveryOptimizer = buildRecoveryOptimizer({
    accounts: enrichedAccounts,
    immediateFreeze,
    networkByAccount,
    rootAmount,
  });
  const behaviorFingerprint = buildBehaviorFingerprint({
    accounts: enrichedAccounts,
    statsMap,
    transactions: normalizedTransactions,
    criminalNetworks,
    victimAccount,
  });
  const muleDetector = buildMuleAccountDetector({
    accounts: enrichedAccounts,
    statsMap,
    transactions: normalizedTransactions,
    victimAccount,
  });
  const identityLinkDetection = buildIdentityLinkDetection({
    accounts: enrichedAccounts,
    victimAccount,
  });
  const fraudSpeedDetection = buildFraudSpeedDetections({
    accounts: enrichedAccounts,
    statsMap,
    victimAccount,
  });
  const humanVulnerabilityDetector = buildHumanVulnerabilityDetector({
    caseData,
    accounts: enrichedAccounts,
    statsMap,
    transactions: normalizedTransactions,
    victimAccount,
  });
  const preWithdrawalFraudLock = buildPreWithdrawalFraudLock({
    accounts: enrichedAccounts,
    statsMap,
    victimAccount,
    latestTransactionTime,
    rootAmount,
    muleDetector,
    fraudSpeedDetection,
    nextTransferPredictions,
    networkByAccount,
  });
  const digitalCriminalTwin = buildDigitalCriminalTwin({
    accounts: enrichedAccounts,
    statsMap,
    transactions: normalizedTransactions,
    victimAccount,
    criminalNetworks,
    identityLinkDetection,
    behaviorFingerprint,
    fraudSpeedDetection,
    preWithdrawalFraudLock,
  });
  const emergencyVictimProtectionMode = buildEmergencyVictimProtectionMode({
    caseData,
    accounts: enrichedAccounts,
    victimAccount,
    immediateFreeze,
    preWithdrawalFraudLock,
    nextTransferPredictions,
    digitalCriminalTwin,
  });
  const autoStrikeMode = buildAutoStrikeMode({
    accounts: enrichedAccounts,
    victimAccount,
    immediateFreeze,
    rootAmount,
    networkByAccount,
    preWithdrawalFraudLock,
    digitalCriminalTwin,
  });
  const fraudDominoCollapseSystem = buildFraudDominoCollapseSystem({
    accounts: enrichedAccounts,
    transactions: normalizedTransactions,
    victimAccount,
    rootAmount,
    networkByAccount,
    preWithdrawalFraudLock,
    digitalCriminalTwin,
  });
  const crossBankNetwork = buildCrossBankNetworkMap({
    accounts: enrichedAccounts,
    transactions: normalizedTransactions,
    transactionPaths,
    victimAccount,
  });

  return {
    rootAmount,
    victimAccount,
    accounts: enrichedAccounts,
    accountsByNumber,
    transactions: normalizedTransactions,
    chainDepths: depths,
    generatedAlerts: buildGeneratedAlerts(
      enrichedAccounts,
      statsMap,
      normalizedTransactions,
      depths,
      fraudSpeedDetection.detections,
      preWithdrawalFraudLock.emergencyFreezeTargets
    ),
    criminalNetworks,
    autoStrikeMode,
    crossBankNetwork,
    digitalCriminalTwin,
    emergencyVictimProtectionMode,
    fraudDominoCollapseSystem,
    fraudSpeedDetection,
    humanVulnerabilityDetector,
    identityLinkDetection,
    immediateFreeze,
    muleDetector,
    networkByAccount,
    nextTransferPredictions,
    nextTransferBySource,
    preWithdrawalFraudLock,
    behaviorFingerprint,
    recoveryOptimizer,
    reviewAccounts,
    transactionPaths,
    recoveryMetrics: {
      totalFraudAmount: round(rootAmount),
      amountRecovered: round(amountRecovered),
      amountFrozen: round(disputedHeld),
      amountStillMoving: round(amountStillMoving),
      releasedToInnocentRecipients: round(releasedToInnocent),
      recoveryPercentage: round(securedPercentage),
    },
  };
}

function cleanImportedValue(value) {
  return String(value ?? "").trim();
}

function buildSyntheticNodeId(prefix, value, fallback) {
  const cleaned = cleanImportedValue(value)
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9:-]+/g, "")
    .replace(/-+/g, "-");

  return `${prefix}-${cleaned || fallback}`;
}

function extractBankActionFormat(record) {
  if (record.atm_id || record.withdrawal_amount) {
    return "atm_withdrawal";
  }

  if (record.put_on_hold_amount || record.timestamp) {
    const actionText = cleanImportedValue(record.bank_action).toLowerCase();
    if (record.bank_action && !record.receiver_account && actionText.includes("bank")) {
      return "put_on_hold";
    }
  }

  if (record.layer || record.receiver_account || record.receiver_ifsc) {
    return "monthly_transfer";
  }

  if (record.sender_account && (record.flag_reason || record.bank_action)) {
    return "low_value_activity";
  }

  return "generic";
}

function normalizeImportedTransaction(record, sequence) {
  const format = extractBankActionFormat(record);
  const caseId = cleanImportedValue(record.case_id || record.acknowledgement_number);
  const transactionId =
    cleanImportedValue(record.transaction_id) || `CSV-${String(sequence).padStart(4, "0")}`;
  const referenceId =
    cleanImportedValue(record.reference_id) || `CSV-REF-${String(sequence).padStart(4, "0")}`;
  const bankAction = cleanImportedValue(record.bank_action);
  const flagReason = cleanImportedValue(record.flag_reason);

  if (format === "monthly_transfer") {
    const senderAccount = cleanImportedValue(record.sender_account);
    const receiverAccount = cleanImportedValue(record.receiver_account);
    const amount = toNumber(record.amount);

    if (!senderAccount || !receiverAccount || amount <= 0) {
      return {
        transaction: null,
        error: "sender, receiver, or amount was missing for a transfer row.",
      };
    }

    return {
      transaction: {
        transaction_id: transactionId,
        sender_account: senderAccount,
        receiver_account: receiverAccount,
        amount,
        timestamp: safeIso(record.timestamp),
        transaction_type: "bank_action_transfer",
        transaction_status: "success",
        reference_id: referenceId,
        case_id: caseId,
        flag_reason: flagReason || "Monthly transfer trail imported from bank action CSV.",
        is_suspicious:
          toNumber(record.disputed_amount) > 0 ||
          `${flagReason} ${bankAction}`.toLowerCase().includes("fraud"),
        sender_name: senderAccount,
        receiver_name: receiverAccount,
        sender_bank: cleanImportedValue(record.sender_bank),
        receiver_bank: cleanImportedValue(record.receiver_bank),
        sender_device: cleanImportedValue(record.sender_device),
        receiver_device: cleanImportedValue(record.receiver_device),
        sender_ip: cleanImportedValue(record.sender_ip),
        receiver_ip: cleanImportedValue(record.receiver_ip),
        sender_location: cleanImportedValue(record.sender_location),
        receiver_location: cleanImportedValue(record.receiver_location),
        disputed_amount: toNumber(record.disputed_amount),
        bank_action: bankAction,
        action_date: cleanImportedValue(record.action_date),
        layer: cleanImportedValue(record.layer),
        receiver_ifsc: cleanImportedValue(record.receiver_ifsc),
        pis_nodal: cleanImportedValue(record.pis_nodal),
      },
      error: null,
    };
  }

  if (format === "put_on_hold") {
    const accountNumber = cleanImportedValue(record.sender_account);
    const amount = toNumber(record.amount);

    if (!accountNumber || amount <= 0) {
      return {
        transaction: null,
        error: "account or held amount was missing for a put-on-hold row.",
      };
    }

    return {
      transaction: {
        transaction_id: transactionId,
        sender_account: `CASE-${caseId || "UNKNOWN"}-ROOT`,
        receiver_account: accountNumber,
        amount,
        timestamp: safeIso(record.timestamp),
        transaction_type: "put_on_hold",
        transaction_status: "held",
        reference_id: referenceId,
        case_id: caseId,
        flag_reason: flagReason || "Funds were put on hold by the bank.",
        is_suspicious: true,
        sender_name: "Victim Complaint Source",
        receiver_name: accountNumber,
        sender_bank: "Complaint Intake",
        receiver_bank: bankAction || "Bank Hold Action",
        sender_device: "",
        receiver_device: "",
        sender_ip: "",
        receiver_ip: "",
        sender_location: "Complaint Origin",
        receiver_location: "",
        disputed_amount: amount,
        bank_action: bankAction,
        action_date: cleanImportedValue(record.action_date),
        layer: cleanImportedValue(record.layer),
        receiver_ifsc: cleanImportedValue(record.receiver_ifsc),
        pis_nodal: cleanImportedValue(record.pis_nodal),
      },
      error: null,
    };
  }

  if (format === "atm_withdrawal") {
    const senderAccount = cleanImportedValue(record.sender_account);
    const amount = toNumber(record.amount);
    const atmAccount = buildSyntheticNodeId(
      "ATM",
      record.receiver_account,
      `CASHOUT-${String(sequence).padStart(3, "0")}`
    );
    const atmLocation = cleanImportedValue(record.receiver_location)
      .replace(/^place\s+of\s+atm\s*:?[-]*/i, "")
      .trim();

    if (!senderAccount || amount <= 0) {
      return {
        transaction: null,
        error: "account or withdrawal amount was missing for an ATM row.",
      };
    }

    return {
      transaction: {
        transaction_id: transactionId,
        sender_account: senderAccount,
        receiver_account: atmAccount,
        amount,
        timestamp: safeIso(record.timestamp),
        transaction_type: "atm_withdrawal",
        transaction_status: "withdrawn",
        reference_id: referenceId,
        case_id: caseId,
        flag_reason: flagReason || "Cash withdrawal through ATM.",
        is_suspicious: true,
        sender_name: senderAccount,
        receiver_name: cleanImportedValue(record.receiver_account) || "ATM Cashout",
        sender_bank: bankAction || cleanImportedValue(record.sender_bank),
        receiver_bank: "ATM Withdrawal",
        sender_device: "",
        receiver_device: cleanImportedValue(record.receiver_account),
        sender_ip: "",
        receiver_ip: "",
        sender_location: "",
        receiver_location: atmLocation,
        disputed_amount: toNumber(record.disputed_amount),
        bank_action: bankAction,
        action_date: cleanImportedValue(record.action_date),
        layer: cleanImportedValue(record.layer),
        receiver_ifsc: cleanImportedValue(record.receiver_ifsc),
        pis_nodal: cleanImportedValue(record.pis_nodal),
      },
      error: null,
    };
  }

  if (format === "low_value_activity") {
    const senderAccount = cleanImportedValue(record.sender_account);
    const receiverLabel =
      cleanImportedValue(record.flag_reason) ||
      cleanImportedValue(record.reference_id) ||
      cleanImportedValue(record.transaction_id) ||
      `LOW-VALUE-${sequence}`;
    const receiverAccount = buildSyntheticNodeId("MICRO", receiverLabel, `NODE-${sequence}`);

    if (!senderAccount) {
      return {
        transaction: null,
        error: "account was missing for a low-value activity row.",
      };
    }

    return {
      transaction: {
        transaction_id: transactionId,
        sender_account: senderAccount,
        receiver_account: receiverAccount,
        amount: 0,
        timestamp: safeIso(record.action_date || record.timestamp),
        transaction_type: "low_value_activity",
        transaction_status: "logged",
        reference_id: referenceId,
        case_id: caseId,
        flag_reason:
          flagReason || "Low-value linked activity below Rs 500 imported from bank trail.",
        is_suspicious: true,
        sender_name: senderAccount,
        receiver_name: receiverLabel,
        sender_bank: bankAction,
        receiver_bank: "Low Value Endpoint",
        sender_device: "",
        receiver_device: "",
        sender_ip: "",
        receiver_ip: "",
        sender_location: "",
        receiver_location: "",
        disputed_amount: 0,
        bank_action: bankAction,
        action_date: cleanImportedValue(record.action_date),
        layer: cleanImportedValue(record.layer),
        receiver_ifsc: cleanImportedValue(record.receiver_ifsc),
        pis_nodal: cleanImportedValue(record.pis_nodal),
      },
      error: null,
    };
  }

  const senderAccount = cleanImportedValue(record.sender_account);
  const receiverAccount = cleanImportedValue(record.receiver_account);
  const amount = toNumber(record.amount);

  if (!senderAccount || !receiverAccount || amount <= 0) {
    return {
      transaction: null,
      error: "sender, receiver, or amount was missing.",
    };
  }

  const suspiciousText = `${flagReason} ${bankAction}`.toLowerCase();
  const inferredSuspicion =
    toNumber(record.disputed_amount) > 0 ||
    ["fraud", "unauthorized", "scam", "suspicious", "alert", "investigation"].some((token) =>
      suspiciousText.includes(token)
    );

  return {
    transaction: {
      transaction_id: transactionId,
      sender_account: senderAccount,
      receiver_account: receiverAccount,
      amount,
      timestamp: safeIso(record.timestamp),
      transaction_type: cleanImportedValue(record.transaction_type) || "IMPS",
      transaction_status: cleanImportedValue(record.transaction_status) || "success",
      reference_id: referenceId,
      case_id: caseId,
      flag_reason: flagReason || "Imported from CSV",
      is_suspicious: inferredSuspicion,
      sender_name: cleanImportedValue(record.sender_name) || senderAccount,
      receiver_name: cleanImportedValue(record.receiver_name) || receiverAccount,
      sender_bank: cleanImportedValue(record.sender_bank),
      receiver_bank: cleanImportedValue(record.receiver_bank),
      sender_device: cleanImportedValue(record.sender_device),
      receiver_device: cleanImportedValue(record.receiver_device),
      sender_ip: cleanImportedValue(record.sender_ip),
      receiver_ip: cleanImportedValue(record.receiver_ip),
      sender_location: cleanImportedValue(record.sender_location),
      receiver_location: cleanImportedValue(record.receiver_location),
      disputed_amount: toNumber(record.disputed_amount),
      bank_action: bankAction,
      action_date: cleanImportedValue(record.action_date),
      layer: cleanImportedValue(record.layer),
      receiver_ifsc: cleanImportedValue(record.receiver_ifsc),
      pis_nodal: cleanImportedValue(record.pis_nodal),
    },
    error: null,
  };
}

export function parseTransactionsCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { transactions: [], errors: ["CSV must include a header row and at least one data row."] };
  }

  const headerValues = splitCsvLine(lines[0]).map((header) => ACCOUNT_HEADER_ALIASES[normalizeHeader(header)] || normalizeHeader(header));
  const transactions = [];
  const errors = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const row = splitCsvLine(lines[lineIndex]);
    const record = {};

    headerValues.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });

    const { transaction, error } = normalizeImportedTransaction(
      record,
      transactions.length + 1
    );

    if (!transaction) {
      errors.push(`Skipped row ${lineIndex + 1} because ${error}`);
      continue;
    }

    transactions.push(transaction);
  }

  return { transactions, errors };
}

export function buildCaseFromTransactions(existingCase, accounts, transactions) {
  const firstTransaction = transactions[0];
  const derivedCaseId =
    transactions.find((transaction) => transaction.case_id)?.case_id ||
    existingCase.complaint_id ||
    `ATP-CSV-${new Date().toISOString().slice(0, 10)}`;
  const victimAccount = firstTransaction?.sender_account || existingCase.victim_account || "";
  const accountsMap = new Map(accounts.map((account) => [account.account_number, account]));
  const victim = accountsMap.get(victimAccount) || {};
  const totalFraudAmount =
    transactions
      .filter((transaction) => transaction.sender_account === victimAccount)
      .reduce((sum, transaction) => sum + transaction.amount, 0) ||
    firstTransaction?.amount ||
    existingCase.fraud_amount ||
    0;

  return {
    ...existingCase,
    complaint_id: derivedCaseId,
    victim_account: victimAccount,
    victim_name: victim.account_holder_name || existingCase.victim_name || victimAccount || "Unknown Victim",
    victim_bank: victim.bank_name || existingCase.victim_bank || "Unknown Bank",
    victim_mobile: victim.mobile_number || existingCase.victim_mobile || "",
    fraud_amount: totalFraudAmount,
    fraud_timestamp: firstTransaction?.timestamp || existingCase.fraud_timestamp || new Date().toISOString(),
    fraud_type: existingCase.fraud_type || "otp_fraud",
    total_accounts_involved: accounts.length,
  };
}

export { formatCurrency };
