#!/usr/bin/env node
// src/cli.js — Unified Node.js CLI for the learning-first plugin. Zero npm dependencies.
process.removeAllListeners('warning');

import crypto from 'node:crypto';
import path from 'node:path';
import * as db from './db.js';
import { notifyServer } from './notify.js';

function out(value) {
  if (value === undefined) return;
  if (typeof value === 'string') {
    process.stdout.write(value.endsWith('\n') ? value : value + '\n');
    return;
  }
  process.stdout.write(JSON.stringify(value) + '\n');
}

function fail(msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

function parseGlobalFlags(argv) {
  const args = [];
  const flags = { repo: null, limit: null, session: null, responseTime: null, confidence: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo') {
      flags.repo = argv[++i];
    } else if (a === '--limit') {
      flags.limit = parseInt(argv[++i], 10);
    } else if (a === '--session') {
      flags.session = argv[++i];
    } else if (a === '--response-time') {
      flags.responseTime = parseInt(argv[++i], 10);
    } else if (a === '--confidence') {
      flags.confidence = parseInt(argv[++i], 10);
    } else {
      args.push(a);
    }
  }
  return { args, flags };
}

function getRepo(flags) {
  return flags.repo || db.detectRepoId();
}

function need(args, n, usageMsg) {
  if (args.length < n) fail(usageMsg);
}

// ---------------- handlers ----------------

function cmdInit() {
  db.init();
  out({ initialized: true });
}

// ----- profile -----
function cmdProfile(_args, flags) {
  const repo = getRepo(flags);
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
  out({
    repo_id: repo,
    topics,
    achievements,
    repo_knowledge: repoKnowledge,
    override_debts: debts,
  });
}

// ----- topic -----
function cmdTopic(args, flags) {
  const sub = args.shift();
  const repo = getRepo(flags);
  switch (sub) {
    case 'get': {
      need(args, 1, 'topic get <id>');
      const rows = db.query(
        `SELECT * FROM knowledge_topics WHERE id=$id AND repo_id=$repo`,
        { $id: args[0], $repo: repo }
      );
      out(rows);
      return;
    }
    case 'upsert': {
      need(args, 5, 'topic upsert <id> <domain> <title> <scope> <depth>');
      const [id, domain, title, scope, depthStr] = args;
      const depth = parseInt(depthStr, 10);
      db.exec(
        `INSERT INTO knowledge_topics (id, repo_id, domain, title, scope, depth_level)
         VALUES ($id, $repo, $domain, $title, $scope, $depth)
         ON CONFLICT(id, repo_id) DO UPDATE SET
           depth_level = MAX(knowledge_topics.depth_level, excluded.depth_level),
           domain = excluded.domain,
           title = excluded.title`,
        { $id: id, $repo: repo, $domain: domain, $title: title, $scope: scope, $depth: depth }
      );
      out({ ok: true, id, repo_id: repo });
      notifyServer('topic-update', { topic_id: id, repo_id: repo });
      return;
    }
    case 'status': {
      need(args, 2, 'topic status <id> <status>');
      const [id, status] = args;
      if (status === 'mastered') {
        db.exec(
          `UPDATE knowledge_topics SET status=$status, mastered_at=datetime('now')
           WHERE id=$id AND repo_id=$repo`,
          { $id: id, $status: status, $repo: repo }
        );
      } else {
        db.exec(
          `UPDATE knowledge_topics SET status=$status WHERE id=$id AND repo_id=$repo`,
          { $id: id, $status: status, $repo: repo }
        );
      }
      out({ ok: true, id, status });
      return;
    }
    case 'mastery': {
      const total = db.scalar(
        `SELECT COUNT(*) FROM knowledge_topics WHERE repo_id=$repo`,
        { $repo: repo }
      );
      const mastered = db.scalar(
        `SELECT COUNT(*) FROM knowledge_topics WHERE repo_id=$repo AND status='mastered'`,
        { $repo: repo }
      );
      const avgDepth = db.scalar(
        `SELECT COALESCE(ROUND(AVG(depth_level)), 1)
         FROM knowledge_topics WHERE repo_id=$repo AND status='mastered'`,
        { $repo: repo }
      );
      const quizPct = db.scalar(
        `SELECT COALESCE(ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)), 0)
         FROM quiz_results WHERE repo_id=$repo`,
        { $repo: repo }
      );
      out({
        repo_id: repo,
        total_topics: total ?? 0,
        mastered: mastered ?? 0,
        avg_depth: avgDepth ?? 1,
        quiz_accuracy: quizPct ?? 0,
      });
      return;
    }
    default:
      fail(`unknown topic subcommand: ${sub}`);
  }
}

// ----- repo-knowledge -----
function cmdRepoKnowledge(args, flags) {
  const sub = args.shift();
  const repo = getRepo(flags);
  switch (sub) {
    case 'get': {
      const area = args[0];
      if (area) {
        out(
          db.query(
            `SELECT * FROM repo_knowledge WHERE repo_id=$repo AND area=$area`,
            { $repo: repo, $area: area }
          )
        );
      } else {
        out(
          db.query(`SELECT * FROM repo_knowledge WHERE repo_id=$repo`, { $repo: repo })
        );
      }
      return;
    }
    case 'set': {
      need(args, 2, 'repo-knowledge set <area> <level>');
      const [area, level] = args;
      db.exec(
        `INSERT INTO repo_knowledge (repo_id, area, familiarity)
         VALUES ($repo, $area, $level)
         ON CONFLICT(repo_id, area) DO UPDATE SET
           familiarity = excluded.familiarity,
           last_assessed_at = datetime('now')`,
        { $repo: repo, $area: area, $level: level }
      );
      out({ ok: true, repo_id: repo, area, familiarity: level });
      return;
    }
    default:
      fail(`unknown repo-knowledge subcommand: ${sub}`);
  }
}

// ----- quiz -----
function cmdQuiz(args, flags) {
  const sub = args.shift();
  const repo = getRepo(flags);
  switch (sub) {
    case 'record': {
      need(args, 6, 'quiz record <topic_id> <question> <answer> <correct:0|1> <feedback> <depth>');
      const [topic_id, question, answer, correctStr, feedback, depthStr] = args;
      const correct = parseInt(correctStr, 10);
      const depth = parseInt(depthStr, 10);
      const session_id = flags.session || null;
      const response_time_ms = Number.isFinite(flags.responseTime) ? flags.responseTime : null;
      const confidence = Number.isFinite(flags.confidence) && flags.confidence >= 1 && flags.confidence <= 5 ? flags.confidence : null;
      const result = db.exec(
        `INSERT INTO quiz_results (repo_id, topic_id, question, user_answer, correct, feedback, depth_level, session_id, response_time_ms, confidence_prediction)
         VALUES ($repo, $topic_id, $question, $answer, $correct, $feedback, $depth, $session_id, $response_time_ms, $confidence)`,
        { $repo: repo, $topic_id: topic_id, $question: question, $answer: answer, $correct: correct, $feedback: feedback, $depth: depth, $session_id: session_id, $response_time_ms: response_time_ms, $confidence: confidence }
      );
      out({ ok: true, id: Number(result.lastInsertRowid) });
      notifyServer('quiz-recorded', { topic_id, repo_id: repo, correct });
      return;
    }
    case 'history': {
      need(args, 1, 'quiz history <topic_id>');
      out(
        db.query(
          `SELECT * FROM quiz_results WHERE topic_id=$t AND repo_id=$repo ORDER BY asked_at DESC`,
          { $t: args[0], $repo: repo }
        )
      );
      return;
    }
    case 'stats': {
      out(
        db.query(
          `SELECT
              COUNT(*) as total,
              SUM(correct) as correct,
              ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)) as pct_correct,
              COUNT(DISTINCT topic_id) as topics_quizzed
           FROM quiz_results WHERE repo_id=$repo`,
          { $repo: repo }
        )
      );
      return;
    }
    case 'topic-stats': {
      need(args, 1, 'quiz topic-stats <topic_id>');
      out(
        db.query(
          `SELECT
              COUNT(*) as total,
              SUM(correct) as correct,
              ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)) as pct_correct,
              MAX(depth_level) as max_depth
           FROM quiz_results WHERE topic_id=$t AND repo_id=$repo`,
          { $t: args[0], $repo: repo }
        )
      );
      return;
    }
    default:
      fail(`unknown quiz subcommand: ${sub}`);
  }
}

// ----- achievement -----
function cmdAchievement(args, flags) {
  const sub = args.shift();
  const repo = getRepo(flags);
  switch (sub) {
    case 'award': {
      need(args, 3, 'achievement award <id> <title> <description> [context]');
      const [id, title, description, context = ''] = args;
      const r = db.exec(
        `INSERT OR IGNORE INTO achievements (id, repo_id, title, description, context)
         VALUES ($id, $repo, $title, $description, $context)`,
        { $id: id, $repo: repo, $title: title, $description: description, $context: context }
      );
      out({ ok: true, id, awarded: r.changes > 0 });
      if (r.changes > 0) notifyServer('achievement-earned', { id, repo_id: repo });
      return;
    }
    case 'list': {
      out(
        db.query(
          `SELECT * FROM achievements WHERE repo_id=$repo OR repo_id='_global' ORDER BY earned_at DESC`,
          { $repo: repo }
        )
      );
      return;
    }
    case 'check': {
      need(args, 1, 'achievement check <id>');
      const count = db.scalar(
        `SELECT COUNT(*) FROM achievements
         WHERE id=$id AND (repo_id=$repo OR repo_id='_global')`,
        { $id: args[0], $repo: repo }
      );
      out({ id: args[0], earned: (count ?? 0) > 0 });
      return;
    }
    default:
      fail(`unknown achievement subcommand: ${sub}`);
  }
}

// ----- curriculum -----
function cmdCurriculum(args, flags) {
  const sub = args.shift();
  const repo = getRepo(flags);
  switch (sub) {
    case 'create': {
      need(args, 3, 'curriculum create <task_id> <description> <modules_json>');
      const [task_id, description, modulesJson] = args;
      let modules;
      try {
        modules = JSON.parse(modulesJson);
      } catch (e) {
        fail(`invalid modules_json: ${e.message}`);
      }
      if (!Array.isArray(modules)) fail('modules_json must be an array');
      db.transaction((t) => {
        t.exec(
          `INSERT INTO curricula (task_id, repo_id, task_description)
           VALUES ($task_id, $repo, $description)`,
          { $task_id: task_id, $repo: repo, $description: description }
        );
        modules.forEach((m, i) => {
          t.exec(
            `INSERT INTO curriculum_modules (task_id, module_index, module_id, title, topic_id)
             VALUES ($task_id, $idx, $module_id, $title, $topic_id)`,
            {
              $task_id: task_id,
              $idx: i,
              $module_id: m.module_id,
              $title: m.title,
              $topic_id: m.topic_id || null,
            }
          );
        });
      });
      out({ ok: true, task_id, modules: modules.length });
      return;
    }
    case 'state': {
      need(args, 1, 'curriculum state <task_id>');
      const task_id = args[0];
      const curriculum = db.query(
        `SELECT * FROM curricula WHERE task_id=$t`,
        { $t: task_id }
      );
      const modules = db.query(
        `SELECT * FROM curriculum_modules WHERE task_id=$t ORDER BY module_index`,
        { $t: task_id }
      );
      const c = curriculum[0] || {};
      out({
        task_id,
        status: c.status || 'unknown',
        current_module_index: c.current_module_index ?? 0,
        modules,
      });
      return;
    }
    case 'current': {
      need(args, 1, 'curriculum current <task_id>');
      const task_id = args[0];
      const idx = db.scalar(
        `SELECT current_module_index FROM curricula WHERE task_id=$t`,
        { $t: task_id }
      );
      const rows = db.query(
        `SELECT * FROM curriculum_modules WHERE task_id=$t AND module_index=$i`,
        { $t: task_id, $i: idx ?? 0 }
      );
      out(rows[0] || null);
      return;
    }
    case 'advance': {
      need(args, 1, 'curriculum advance <task_id>');
      db.exec(
        `UPDATE curricula SET current_module_index = current_module_index + 1 WHERE task_id=$t`,
        { $t: args[0] }
      );
      out({ ok: true, task_id: args[0] });
      notifyServer('curriculum-advanced', { task_id: args[0], repo_id: repo });
      return;
    }
    case 'module-status': {
      need(args, 3, 'curriculum module-status <task_id> <index> <status> [reason]');
      const [task_id, idxStr, status, reason] = args;
      const idx = parseInt(idxStr, 10);
      let timeClause = '';
      if (status === 'active') timeClause = ", started_at = datetime('now')";
      else if (status === 'completed' || status === 'skipped')
        timeClause = ", completed_at = datetime('now')";
      db.exec(
        `UPDATE curriculum_modules
         SET status=$status, skipped_reason=$reason${timeClause}
         WHERE task_id=$task_id AND module_index=$idx`,
        { $status: status, $reason: reason ?? null, $task_id: task_id, $idx: idx }
      );
      out({ ok: true, task_id, module_index: idx, status });
      return;
    }
    case 'complete': {
      process.stderr.write('⚠️  curriculum complete is deprecated, use "curriculum end <task_id> completed" instead\n');
      need(args, 1, 'curriculum complete <task_id>');
      return curriculumEnd(args[0], 'completed');
    }
    case 'abandon': {
      process.stderr.write('⚠️  curriculum abandon is deprecated, use "curriculum end <task_id> abandoned" instead\n');
      need(args, 1, 'curriculum abandon <task_id>');
      return curriculumEnd(args[0], 'abandoned');
    }
    case 'end': {
      need(args, 2, 'curriculum end <task_id> <completed|abandoned>');
      const [task_id, status] = args;
      if (!['completed', 'abandoned'].includes(status)) {
        fail(`status must be completed or abandoned, got: ${status}`);
      }
      return curriculumEnd(task_id, status);
    }
    default:
      fail(`unknown curriculum subcommand: ${sub}`);
  }
}

// ----- repo -----
function curriculumEnd(task_id, status) {
  db.exec(
    `UPDATE curricula SET status=$status, completed_at=datetime('now') WHERE task_id=$t`,
    { $status: status, $t: task_id }
  );
  out({ ok: true, task_id, status });
  notifyServer('curriculum-advanced', { task_id, status });
}

function debtResolve(id, status) {
  db.exec(
    `UPDATE override_debts SET status=$status, caught_up_at=datetime('now') WHERE id=$id`,
    { $status: status, $id: id }
  );
  out({ ok: true, debt_id: id, status });
}

function cmdRepo(args, _flags) {
  const sub = args.shift();
  switch (sub) {
    case 'detect': {
      const repo_id = db.detectRepoId();
      const repo_name = path.basename(process.cwd());
      out({ repo_id, repo_name });
      return;
    }
    case 'pref': {
      need(args, 1, 'repo pref <repo_id>');
      const rows = db.query(
        `SELECT * FROM repo_preferences WHERE repo_id=$r`,
        { $r: args[0] }
      );
      if (rows.length === 0) out({ exists: false });
      else out({ ...rows[0], exists: true });
      return;
    }
    case 'enable': {
      need(args, 3, 'repo enable <repo_id> <repo_name> <0|1>');
      const [repo_id, repo_name, enabledStr] = args;
      const enabled = parseInt(enabledStr, 10);
      db.exec(
        `INSERT INTO repo_preferences (repo_id, repo_name, learning_enabled)
         VALUES ($repo_id, $repo_name, $enabled)
         ON CONFLICT(repo_id) DO UPDATE SET
           learning_enabled = excluded.learning_enabled,
           last_session_at = datetime('now')`,
        { $repo_id: repo_id, $repo_name: repo_name, $enabled: enabled }
      );
      out({ ok: true, repo_id, learning_enabled: enabled });
      return;
    }
    case 'override': {
      need(args, 2, 'repo override <repo_id> <task> [area] [topics]');
      const [repo_id, task, area, topics] = args;
      const r = db.exec(
        `INSERT INTO override_debts (repo_id, task_description, area, topics_skipped)
         VALUES ($repo_id, $task, $area, $topics)`,
        { $repo_id: repo_id, $task: task, $area: area ?? null, $topics: topics ?? null }
      );
      out({ ok: true, debt_id: Number(r.lastInsertRowid) });
      return;
    }
    case 'debts': {
      need(args, 1, 'repo debts <repo_id>');
      out(
        db.query(
          `SELECT * FROM override_debts WHERE repo_id=$r AND status='pending' ORDER BY created_at DESC`,
          { $r: args[0] }
        )
      );
      return;
    }
    case 'catch-up': {
      process.stderr.write('⚠️  repo catch-up is deprecated, use "repo debt-resolve <id> caught_up" instead\n');
      need(args, 1, 'repo catch-up <debt_id>');
      return debtResolve(parseInt(args[0], 10), 'caught_up');
    }
    case 'dismiss': {
      process.stderr.write('⚠️  repo dismiss is deprecated, use "repo debt-resolve <id> dismissed" instead\n');
      need(args, 1, 'repo dismiss <debt_id>');
      return debtResolve(parseInt(args[0], 10), 'dismissed');
    }
    case 'debt-resolve': {
      need(args, 2, 'repo debt-resolve <debt_id> <caught_up|dismissed>');
      const [idStr, status] = args;
      if (!['caught_up', 'dismissed'].includes(status)) {
        fail(`status must be caught_up or dismissed, got: ${status}`);
      }
      return debtResolve(parseInt(idStr, 10), status);
    }
    case 'touch': {
      process.stderr.write('⚠️  repo touch is deprecated\n');
      need(args, 1, 'repo touch <repo_id>');
      db.exec(
        `UPDATE repo_preferences SET last_session_at=datetime('now') WHERE repo_id=$r`,
        { $r: args[0] }
      );
      out({ ok: true, repo_id: args[0] });
      return;
    }
    default:
      fail(`unknown repo subcommand: ${sub}`);
  }
}

// ----- review (SM-2) -----
function cmdReview(args, flags) {
  const sub = args.shift();
  const repo = getRepo(flags);
  switch (sub) {
    case 'next-due': {
      const limit = flags.limit && Number.isFinite(flags.limit) ? flags.limit : 5;
      out(
        db.query(
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
        )
      );
      return;
    }
    case 'init-topic': {
      need(args, 1, 'review init-topic <topic_id>');
      db.exec(
        `INSERT OR IGNORE INTO topic_review_state
         (repo_id, topic_id, ease_factor, interval_days, next_review_at)
         VALUES ($repo, $t, 2.5, 1, datetime('now'))`,
        { $repo: repo, $t: args[0] }
      );
      out({ ok: true, topic_id: args[0] });
      return;
    }
    case 'state': {
      need(args, 1, 'review state <topic_id>');
      out(
        db.query(
          `SELECT * FROM topic_review_state WHERE repo_id=$repo AND topic_id=$t`,
          { $repo: repo, $t: args[0] }
        )
      );
      return;
    }
    case 'lapses': {
      out(
        db.query(
          `WITH latest_quiz AS (
             SELECT topic_id, correct, asked_at,
                    ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY asked_at DESC) AS rn
             FROM quiz_results WHERE repo_id=$repo
           )
           SELECT kt.id AS topic_id, kt.title, kt.domain,
                  kt.mastered_at, lq.correct AS last_correct, lq.asked_at AS last_asked_at,
                  COALESCE(trs.lapse_count, 0) AS lapse_count
           FROM knowledge_topics kt
           LEFT JOIN latest_quiz lq ON lq.topic_id = kt.id AND lq.rn = 1
           LEFT JOIN topic_review_state trs
                  ON trs.topic_id = kt.id AND trs.repo_id = kt.repo_id
           WHERE kt.repo_id=$repo
             AND (
               (kt.mastered_at IS NOT NULL AND lq.correct = 0 AND lq.asked_at > kt.mastered_at)
               OR COALESCE(trs.lapse_count, 0) > 0
             )
           ORDER BY lq.asked_at DESC`,
          { $repo: repo }
        )
      );
      return;
    }
    case 'record': {
      need(args, 2, 'review record <topic_id> <outcome>');
      const [topic_id, outcome] = args;
      if (!['easy', 'good', 'hard', 'lapse'].includes(outcome)) {
        fail(`unknown outcome: ${outcome} (use easy|good|hard|lapse)`);
      }
      const result = db.transaction((t) => {
        t.exec(
          `INSERT OR IGNORE INTO topic_review_state
           (repo_id, topic_id, ease_factor, interval_days, next_review_at)
           VALUES ($repo, $t, 2.5, 1, datetime('now'))`,
          { $repo: repo, $t: topic_id }
        );
        const cur = t.query(
          `SELECT ease_factor, interval_days, correct_streak, lapse_count, last_reviewed_at
           FROM topic_review_state WHERE repo_id=$repo AND topic_id=$t`,
          { $repo: repo, $t: topic_id }
        )[0] || {};
        let ef = Number(cur.ease_factor ?? 2.5);
        let days = Number(cur.interval_days ?? 1);
        let streak = Number(cur.correct_streak ?? 0);
        let lapses = Number(cur.lapse_count ?? 0);

        switch (outcome) {
          case 'easy':
            ef = ef + 0.15;
            days = days * 2.5;
            streak += 1;
            break;
          case 'good':
            days = days * 2.0;
            streak += 1;
            break;
          case 'hard':
            ef = Math.max(1.3, ef - 0.15);
            days = days * 1.3;
            streak += 1;
            break;
          case 'lapse':
            ef = Math.max(1.3, ef - 0.2);
            days = 1;
            streak = 0;
            lapses += 1;
            break;
        }

        let retentionPassed = false;
        if (outcome !== 'lapse') {
          const elig = t.scalar(
            `SELECT CASE
               WHEN last_reviewed_at IS NOT NULL
                    AND (julianday('now') - julianday(last_reviewed_at)) >= 7
               THEN 1 ELSE 0 END
             FROM topic_review_state WHERE repo_id=$repo AND topic_id=$t`,
            { $repo: repo, $t: topic_id }
          );
          retentionPassed = elig === 1;
        }

        const efRounded = Number(ef.toFixed(4));
        const daysRounded = Number(days.toFixed(4));
        const sql = retentionPassed
          ? `UPDATE topic_review_state SET
               ease_factor = $ef,
               interval_days = $days,
               correct_streak = $streak,
               lapse_count = $lapses,
               last_reviewed_at = datetime('now'),
               next_review_at = datetime('now', '+' || $days || ' days'),
               retention_passed_at = datetime('now')
             WHERE repo_id=$repo AND topic_id=$t`
          : `UPDATE topic_review_state SET
               ease_factor = $ef,
               interval_days = $days,
               correct_streak = $streak,
               lapse_count = $lapses,
               last_reviewed_at = datetime('now'),
               next_review_at = datetime('now', '+' || $days || ' days')
             WHERE repo_id=$repo AND topic_id=$t`;
        t.exec(sql, {
          $ef: efRounded,
          $days: daysRounded,
          $streak: streak,
          $lapses: lapses,
          $repo: repo,
          $t: topic_id,
        });
        return t.query(
          `SELECT * FROM topic_review_state WHERE repo_id=$repo AND topic_id=$t`,
          { $repo: repo, $t: topic_id }
        );
      });
      out(result);
      return;
    }
    default:
      fail(`unknown review subcommand: ${sub}`);
  }
}

// ----- session -----
function genSessionId() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rnd = crypto.randomBytes(4).toString('hex');
  return `sess-${ts}-${rnd}`;
}

function cmdSession(args, flags) {
  const sub = args.shift();
  switch (sub) {
    case 'start': {
      const repo = getRepo(flags);
      const id = genSessionId();
      db.exec(
        `INSERT INTO learning_sessions (id, repo_id, started_at)
         VALUES ($id, $repo, datetime('now'))`,
        { $id: id, $repo: repo }
      );
      out({ session_id: id, repo_id: repo });
      return;
    }
    case 'end': {
      need(args, 1, 'session end <session_id>');
      const id = args[0];
      db.exec(
        `UPDATE learning_sessions
         SET ended_at = datetime('now'),
             duration_minutes = CAST((julianday('now') - julianday(started_at)) * 24 * 60 AS INTEGER)
         WHERE id=$id`,
        { $id: id }
      );
      out(
        db.query(`SELECT * FROM learning_sessions WHERE id=$id`, { $id: id })
      );
      return;
    }
    case 'get': {
      need(args, 1, 'session get <session_id>');
      out(
        db.query(`SELECT * FROM learning_sessions WHERE id=$id`, { $id: args[0] })
      );
      return;
    }
    case 'active': {
      const repo = getRepo(flags);
      out(
        db.query(
          `SELECT * FROM learning_sessions
           WHERE repo_id=$repo AND ended_at IS NULL
           ORDER BY started_at DESC LIMIT 1`,
          { $repo: repo }
        )
      );
      return;
    }
    case 'fatigue': {
      need(args, 1, 'session fatigue <session_id>');
      out(fatigueCheck(args[0]));
      return;
    }
    case 'rate': {
      need(args, 2, 'session rate <session_id> <1-5>');
      const [id, ratingStr] = args;
      const rating = parseInt(ratingStr, 10);
      if (![1, 2, 3, 4, 5].includes(rating)) fail('rating must be 1-5');
      db.exec(
        `UPDATE learning_sessions SET self_rated_quality=$r WHERE id=$id`,
        { $r: rating, $id: id }
      );
      out({ ok: true, session_id: id, self_rated_quality: rating });
      return;
    }
    case 'note': {
      need(args, 2, 'session note <session_id> <text>');
      const [id, text] = args;
      db.exec(
        `UPDATE learning_sessions
         SET notes = CASE
             WHEN notes IS NULL OR notes='' THEN $text
             ELSE notes || char(10) || $text
         END
         WHERE id=$id`,
        { $id: id, $text: text }
      );
      out({ ok: true, session_id: id });
      return;
    }
    case 'suggest-break': {
      process.stderr.write('⚠️  session suggest-break is deprecated, use "session fatigue" instead\n');
      need(args, 1, 'session suggest-break <session_id>');
      const f = fatigueCheck(args[0]);
      out({ session_id: args[0], break_suggested: f.break_suggested });
      return;
    }
    default:
      fail(`unknown session subcommand: ${sub}`);
  }
}

function fatigueCheck(sid) {
  const total = db.scalar(
    `SELECT COUNT(*) FROM (SELECT 1 FROM quiz_results
     WHERE session_id=$sid ORDER BY asked_at DESC LIMIT 5)`,
    { $sid: sid }
  ) ?? 0;
  const correct = db.scalar(
    `SELECT COALESCE(SUM(correct),0) FROM (SELECT correct FROM quiz_results
     WHERE session_id=$sid ORDER BY asked_at DESC LIMIT 5)`,
    { $sid: sid }
  ) ?? 0;
  const avgRt = db.scalar(
    `SELECT COALESCE(ROUND(AVG(response_time_ms)),0) FROM (
       SELECT response_time_ms FROM quiz_results
       WHERE session_id=$sid AND response_time_ms IS NOT NULL
       ORDER BY asked_at DESC LIMIT 5)`,
    { $sid: sid }
  ) ?? 0;
  const active = db.scalar(
    `SELECT CAST(
       (julianday(COALESCE(ended_at, datetime('now'))) - julianday(started_at)) * 24 * 60
       AS INTEGER)
     FROM learning_sessions WHERE id=$sid`,
    { $sid: sid }
  ) ?? 0;

  const t = Number(total);
  const c = Number(correct);
  const rt = Number(avgRt);
  const am = Number(active);

  const err = t > 0 ? (t - c) / t : 0;
  let rtF = rt > 30000 ? (rt - 30000) / 30000 : 0;
  if (rtF > 1) rtF = 1;
  let timeF = am > 25 ? (am - 25) / 25 : 0;
  if (timeF > 1) timeF = 1;
  let s = 0.5 * err + 0.3 * rtF + 0.2 * timeF;
  if (s < 0) s = 0;
  if (s > 1) s = 1;
  const score = Number(s.toFixed(3));

  const breakSuggested = score > 0.6 || am > 25;

  db.exec(
    `UPDATE learning_sessions SET fatigue_score=$score WHERE id=$sid`,
    { $score: score, $sid: sid }
  );

  return {
    session_id: sid,
    fatigue_score: score,
    active_minutes: am,
    recent_quizzes: t,
    recent_correct: c,
    avg_response_time_ms: rt,
    break_suggested: breakSuggested,
  };
}

// ----- server -----
async function cmdServer(args) {
  const sub = args.shift();
  const daemon = await import('./daemon.js');
  switch (sub) {
    case 'status': {
      const s = await daemon.status();
      if (s.running) {
        out({ ...s, url: `http://localhost:${s.port}/` });
      } else {
        out(s);
      }
      return;
    }
    case 'start': {
      const r = await daemon.startDaemon();
      if (r.alreadyRunning) {
        out({ ...r, url: `http://localhost:${r.port}/` });
      } else {
        out({ ...r, url: r.port ? `http://localhost:${r.port}/` : null });
      }
      return;
    }
    case 'stop': {
      const r = await daemon.stopDaemon();
      out(r);
      return;
    }
    default:
      fail(`unknown server subcommand: ${sub}`);
  }
}

async function cmdDoctor() {
  db.init();
  const integrity = db.scalar('PRAGMA integrity_check');
  const { status: serverStatus } = await import('./daemon.js');
  const s = await serverStatus();
  const topicCount = db.scalar('SELECT COUNT(*) FROM knowledge_topics');
  const quizCount = db.scalar('SELECT COUNT(*) FROM quiz_results');
  out({
    db: {
      path: db.getDbPath(),
      integrity,
      topics: topicCount,
      quizzes: quizCount,
    },
    server: s,
    node: process.version,
    version: '0.3.0',
  });
}

// ---------------- main ----------------

const USAGE = `Usage: cli.js <module> <command> [--repo R] [args...]
Modules: init | profile | topic | repo-knowledge | quiz | achievement |
         curriculum | repo | review | session | server | doctor`;

async function main() {
  const argv = process.argv.slice(2);
  const { args, flags } = parseGlobalFlags(argv);
  if (args.length === 0) fail(USAGE);

  const mod = args.shift();
  try {
    switch (mod) {
      case 'init':
        cmdInit();
        break;
      case 'profile':
        cmdProfile(args, flags);
        break;
      case 'topic':
        cmdTopic(args, flags);
        break;
      case 'repo-knowledge':
        cmdRepoKnowledge(args, flags);
        break;
      case 'quiz':
        cmdQuiz(args, flags);
        break;
      case 'achievement':
        cmdAchievement(args, flags);
        break;
      case 'curriculum':
        cmdCurriculum(args, flags);
        break;
      case 'repo':
        cmdRepo(args, flags);
        break;
      case 'review':
        cmdReview(args, flags);
        break;
      case 'session':
        cmdSession(args, flags);
        break;
      case 'server':
        await cmdServer(args);
        break;
      case 'doctor':
        await cmdDoctor();
        break;
      default:
        fail(`unknown module: ${mod}\n${USAGE}`);
    }
  } catch (err) {
    fail(err.message);
  } finally {
    try {
      db.close();
    } catch {}
  }
}

main();
