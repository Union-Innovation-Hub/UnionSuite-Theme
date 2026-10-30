/*
 * UnionSuite help matcher: the "dumb chatbot" brain.
 *
 * Matches a typed question to a help topic by words, with no AI. Each
 * topic's title, sample questions (asks), keywords and short answer are
 * weighted, rarer words count for more, and a question that closely
 * matches one of a topic's sample questions gets a bonus.
 *
 * Works in the browser (window.UnionSuiteHelpMatch) and in Node
 * (require). The staff help pages (docs/user-guide/, built by
 * tools/build-user-guide.cjs) inline it for their Ask a question box, and
 * the side pane's Case help chat loads it from the theme, so both answer
 * alike. Feed it the <area>-help.json the build writes, or the topics a
 * help page embeds:
 *
 *   const matcher = UnionSuiteHelpMatch.create(helpJson);
 *   matcher.reply('how do i close a case');
 *   // {sure: true, topic: {...}, others: [{...}, {...}]}
 *
 * To improve a miss, add the question to the topic's asks, or a word to
 * its keywords or to synonyms.json. Never tune the weights for one case.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UnionSuiteHelpMatch = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Words that say nothing about which topic is wanted.
  const STOP = new Set((
    'a an the i im ive id me my mine we our us you your to do does did done how ' +
    'can could would should will is it its on of for in at by from into this that ' +
    'these those what where when which who whom why with be been am are was were ' +
    'so and or there any some please want wanted need needs get got there here ' +
    'not dont doesnt cant cannot isnt wont just only also then than if about ' +
    'way thing something anything help using use'
  ).split(' '));

  // Field weights: how much a word counts by where the topic has it.
  const WEIGHT = {title: 3, keywords: 3, asks: 2, answer: 1};

  // A question sharing at least this share of a sample question's words
  // gets a bonus, scaled by the share.
  const ASK_BONUS = 4;

  // Below this score the matcher is not sure, and says so.
  const SURE_SCORE = 2.5;

  // Other suggestions must score at least this share of the best, so a
  // topic sharing only a common word ("case") is not offered.
  const OTHER_SHARE = 0.5;

  function words(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[‘’']/g, '')
      .replace(/\*\*|`/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(Boolean);
  }

  function stem(word) {
    if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.length > 5 && word.endsWith('ing')) word = word.slice(0, -3);
    else if (word.length > 4 && word.endsWith('ed')) word = word.slice(0, -2);
    else if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) word = word.slice(0, -1);
    if (word.length > 3 && word.endsWith('e')) word = word.slice(0, -1);
    return word;
  }

  // Synonym keys with a space are phrases ("to do"), swapped before the
  // text is split into words.
  function phrases(text, synonyms) {
    let out = ' ' + words(text).join(' ') + ' ';
    for (const key of Object.keys(synonyms)) {
      if (key.includes(' ')) out = out.split(' ' + key + ' ').join(' ' + synonyms[key] + ' ');
    }
    return out;
  }

  function terms(text, synonyms) {
    const out = [];
    for (const word of words(phrases(text, synonyms))) {
      if (STOP.has(word)) continue;
      const canonical = synonyms[word] || word;
      for (const part of words(canonical)) out.push(stem(part));
    }
    return out;
  }

  function create(help) {
    const synonyms = help.synonyms || {};
    const topics = help.topics.map(topic => {
      const weights = new Map();
      const add = (text, weight) => {
        for (const term of new Set(terms(text, synonyms))) {
          weights.set(term, Math.max(weights.get(term) || 0, weight));
        }
      };
      add(topic.title, WEIGHT.title);
      add((topic.keywords || []).join(' '), WEIGHT.keywords);
      add((topic.asks || []).join(' '), WEIGHT.asks);
      add(topic.answer_text, WEIGHT.answer);
      const asks = (topic.asks || []).map(ask => new Set(terms(ask, synonyms)));
      return {topic, weights, asks};
    });

    // Rarer words decide more: "case" is in every topic, "reopen" in one.
    const idf = new Map();
    for (const entry of topics) {
      for (const term of entry.weights.keys()) idf.set(term, (idf.get(term) || 0) + 1);
    }
    for (const [term, count] of idf) idf.set(term, Math.log(1 + topics.length / count));

    function rank(question, limit) {
      const asked = [...new Set(terms(question, synonyms))].filter(term => idf.has(term));
      if (!asked.length) return [];
      return topics
        .map(entry => {
          let score = 0;
          for (const term of asked) score += (entry.weights.get(term) || 0) * idf.get(term);
          let overlap = 0;
          for (const ask of entry.asks) {
            if (!ask.size) continue;
            const shared = asked.filter(term => ask.has(term)).length;
            overlap = Math.max(overlap, shared / Math.max(ask.size, asked.length));
          }
          if (overlap >= 0.5) score += ASK_BONUS * overlap;
          return {topic: entry.topic, score: Math.round(score * 100) / 100};
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit || 3);
    }

    function reply(question) {
      const results = rank(question, 3);
      if (!results.length) return {sure: false, topic: null, others: []};
      const [best, ...others] = results;
      return {
        sure: best.score >= SURE_SCORE,
        topic: best.topic,
        score: best.score,
        others: others.filter(result => result.score >= best.score * OTHER_SHARE).map(result => result.topic)
      };
    }

    return {rank, reply};
  }

  return {create, terms, stem};
});
