// src/server/queries.js — DB query wrappers used by route handlers.
import * as db from '../db.js';

export function getProfile(repo) {
  const topics = db.query(
    `SELECT * FROM knowledge_topics WHERE repo_id=$repo OR repo_id='_global' ORDER BY first_seen_at DESC`,
    { $repo: repo }
  );
  const achievements = db.query(
    `SELECT * FROM achievements WHERE repo_id=$repo OR repo_id='_global' ORDER BY earned_at DESC`,
    { $repo: repo }
  );
  const repoKnowledge = db.query(
    `SELECT * FROM repo_knowledge WHERE repo_id=$repo ORDER BY last_assessed_at DESC`,
    { $repo: repo }
  );
  const debts = db.query(
    `SELECT * FROM override_debts WHERE repo_id=$repo AND status='pending' ORDER BY created_at DESC`,
    { $repo: repo }
  );
  return {
    repo_id: repo,
    topics,
    achievements,
    repo_knowledge: repoKnowledge,
    override_debts: debts,
  };
}

export function getTopic(id, repo) {
  return db.query(
    `SELECT * FROM knowledge_topics WHERE id=$id AND (repo_id=$repo OR repo_id='_global')`,
    { $id: id, $repo: repo }
  );
}

export function upsertTopic({ id, domain, title, scope, depth, repo }) {
  db.exec(
    `INSERT INTO knowledge_topics (id, repo_id, domain, title, scope, depth_level)
     VALUES ($id, $repo, $domain, $title, $scope, $depth)
     ON CONFLICT(id, repo_id) DO UPDATE SET
       depth_level = MAX(knowledge_topics.depth_level, excluded.depth_level),
       domain = excluded.domain,
       title = excluded.title`,
    { $id: id, $repo: repo, $domain: domain, $title: title, $scope: scope, $depth: parseInt(depth, 10) || 1 }
  );
  return { ok: true, id, repo_id: repo };
}

export function getQuizStats(repo) {
  return db.query(
    `SELECT
        COUNT(*) as total,
        SUM(correct) as correct,
        ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)) as pct_correct,
        COUNT(DISTINCT topic_id) as topics_quizzed
     FROM quiz_results WHERE repo_id=$repo`,
    { $repo: repo }
  );
}

export function getAchievements(repo) {
  return db.query(
    `SELECT * FROM achievements WHERE repo_id=$repo OR repo_id='_global' ORDER BY earned_at DESC`,
    { $repo: repo }
  );
}

export function getCurriculum(taskId) {
  const curr = db.query(`SELECT * FROM curricula WHERE task_id=$t`, { $t: taskId });
  const modules = db.query(
    `SELECT * FROM curriculum_modules WHERE task_id=$t ORDER BY module_index ASC`,
    { $t: taskId }
  );
  return { curriculum: curr[0] || null, modules };
}

export function getRepoPref(repoId) {
  const rows = db.query(
    `SELECT * FROM repo_preferences WHERE repo_id=$r`,
    { $r: repoId }
  );
  if (rows.length === 0) return { exists: false };
  return { ...rows[0], exists: true };
}

export function getReviewNextDue(repo, limit) {
  return db.query(
    `SELECT trs.*, kt.title, kt.domain, kt.depth_level, kt.status
     FROM topic_review_state trs
     LEFT JOIN knowledge_topics kt
       ON kt.id = trs.topic_id AND kt.repo_id = trs.repo_id
     WHERE trs.repo_id=$repo
       AND trs.next_review_at IS NOT NULL
       AND trs.next_review_at <= datetime('now')
     ORDER BY trs.next_review_at ASC
     LIMIT $limit`,
    { $repo: repo, $limit: limit }
  );
}

export function getSession(id) {
  return db.query(`SELECT * FROM learning_sessions WHERE id=$id`, { $id: id });
}

// ---------- New (Change 5b) endpoints ----------

export function listRepos() {
  return db.query(
    `SELECT rp.repo_id, rp.repo_name, rp.learning_enabled, rp.last_session_at,
       (SELECT COUNT(*) FROM knowledge_topics kt WHERE kt.repo_id = rp.repo_id) AS topic_count,
       (SELECT COUNT(*) FROM quiz_results qr WHERE qr.repo_id = rp.repo_id) AS quiz_count
     FROM repo_preferences rp
     ORDER BY rp.last_session_at DESC`
  );
}

export function listTopics(repo, { domain, status, depth } = {}) {
  const params = { $repo: repo };
  let sql = `SELECT * FROM knowledge_topics WHERE repo_id = $repo`;
  if (domain) {
    sql += ` AND domain = $domain`;
    params.$domain = domain;
  }
  if (status) {
    sql += ` AND status = $status`;
    params.$status = status;
  }
  if (depth !== undefined && depth !== null && depth !== '') {
    const d = parseInt(depth, 10);
    if (!Number.isNaN(d)) {
      sql += ` AND depth_level = $depth`;
      params.$depth = d;
    }
  }
  sql += ` ORDER BY first_seen_at DESC`;
  return db.query(sql, params);
}

export function getQuizHistory(repo, bucket = 'day') {
  const expr = bucket === 'week'
    ? `strftime('%Y-W%W', asked_at)`
    : `date(asked_at)`;
  return db.query(
    `SELECT ${expr} AS bucket,
            COUNT(*) AS total,
            SUM(correct) AS correct,
            ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1), 1) AS pct
     FROM quiz_results
     WHERE repo_id = $repo
     GROUP BY bucket
     ORDER BY bucket`,
    { $repo: repo }
  );
}

export function getQuizByTopic(repo) {
  return db.query(
    `SELECT topic_id,
            COUNT(*) AS total,
            SUM(correct) AS correct,
            ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1), 1) AS pct
     FROM quiz_results
     WHERE repo_id = $repo
     GROUP BY topic_id
     ORDER BY pct ASC`,
    { $repo: repo }
  );
}

export function listSessions(repo, { limit = 20, since } = {}) {
  const params = { $repo: repo, $limit: parseInt(limit, 10) || 20 };
  let sql = `SELECT * FROM learning_sessions WHERE repo_id = $repo`;
  if (since) {
    sql += ` AND started_at > $since`;
    params.$since = since;
  }
  sql += ` ORDER BY started_at DESC LIMIT $limit`;
  return db.query(sql, params);
}

export function getDebts(repo) {
  return db.query(
    `SELECT * FROM override_debts
     WHERE repo_id = $repo AND status = 'pending'
     ORDER BY created_at DESC`,
    { $repo: repo }
  );
}
