import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Helper to print formatting and exit appropriately
function finishValidation(errors, warnings) {
  // Print all warnings first
  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(w));
  }
  
  if (errors.length > 0) {
    errors.forEach(e => console.error(e));
    console.log('\nFAIL');
    process.exit(1);
  } else {
    console.log('PASS');
    process.exit(0);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node tools/validate-lesson.js <path-to-lesson-json>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading file: ${err.message}`);
    process.exit(1);
  }

  let lesson;
  try {
    lesson = JSON.parse(fileContent);
  } catch (err) {
    console.error(`ERROR: Invalid JSON structure: ${err.message}`);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  // --- 1. Top-Level Keys & File Match ---
  const filename = path.basename(filePath);
  const expectedId = filename.replace(/\.json$/, '');
  if (lesson.id !== expectedId) {
    errors.push(`[ERROR] Lesson id "${lesson.id}" does not match filename "${filename}" (expected "${expectedId}")`);
  }

  const allowedTopKeys = ['id', 'title', 'unitId', 'unitTitle', 'pages', 'questions'];
  for (const key of allowedTopKeys) {
    if (!(key in lesson)) {
      errors.push(`[ERROR] Missing top-level key: "${key}"`);
    }
  }
  for (const key of Object.keys(lesson)) {
    if (!allowedTopKeys.includes(key)) {
      errors.push(`[ERROR] Unknown top-level key: "${key}"`);
    }
  }

  // Unit details matching CONFIG.UNITS in src/config/config.js
  try {
    const configPath = path.resolve(process.cwd(), 'src/config/config.js');
    if (!fs.existsSync(configPath)) {
      errors.push(`[ERROR] Config file not found at ${configPath}`);
    } else {
      const { CONFIG } = await import(pathToFileURL(configPath).href);
      if (!CONFIG || !Array.isArray(CONFIG.UNITS)) {
        errors.push(`[ERROR] CONFIG.UNITS not found in config.js`);
      } else {
        const unit = CONFIG.UNITS.find(u => u.id === lesson.unitId);
        if (!unit) {
          errors.push(`[ERROR] unitId "${lesson.unitId}" not found in CONFIG.UNITS`);
        } else {
          if (lesson.unitTitle !== unit.title) {
            errors.push(`[ERROR] unitTitle "${lesson.unitTitle}" does not match CONFIG.UNITS unit title "${unit.title}"`);
          }
          if (!unit.lessons.includes(lesson.id)) {
            errors.push(`[ERROR] Lesson ID "${lesson.id}" not found in unit lessons: [${unit.lessons.join(', ')}]`);
          }
        }
      }
    }
  } catch (err) {
    errors.push(`[ERROR] Failed to import and validate against CONFIG: ${err.message}`);
  }

  // Exit early if basic schema/ID check fails
  if (errors.length > 0) {
    finishValidation(errors, warnings);
    return;
  }

  // Extract lesson number
  const lessonIdMatch = lesson.id.match(/^lesson(\d+)$/);
  if (!lessonIdMatch) {
    errors.push(`[ERROR] Lesson id "${lesson.id}" must match pattern "lesson{N}" where {N} is a number`);
  }
  const N = lessonIdMatch ? lessonIdMatch[1] : null;

  // --- 2. Page sequence and metadata checks ---
  let lastPhase = -1;
  if (Array.isArray(lesson.pages)) {
    for (let i = 0; i < lesson.pages.length; i++) {
      const page = lesson.pages[i];
      const pageIdxStr = String(i + 1).padStart(2, '0');
      const expectedPageId = N ? `lesson${N}-p${pageIdxStr}` : null;
      
      if (expectedPageId && page.id !== expectedPageId) {
        errors.push(`[ERROR] Page at index ${i} has id "${page.id}" but expected "${expectedPageId}"`);
      }
      
      if (page.type !== 'content') {
        errors.push(`[ERROR] [${page.id}] Page type must be "content", found "${page.type}"`);
      }
      
      if (typeof page.title !== 'string' || page.title.trim() === '') {
        errors.push(`[ERROR] [${page.id}] Page title must be a non-empty string`);
      } else {
        if (page.title !== page.title.toUpperCase()) {
          errors.push(`[ERROR] [${page.id}] Page title "${page.title}" must be UPPERCASE`);
        }
        const prefix = N ? `LEÇON ${N} : ` : 'LEÇON ';
        if (!page.title.startsWith(prefix)) {
          errors.push(`[ERROR] [${page.id}] Page title "${page.title}" must start with "${prefix}"`);
        }
      }
      
      if (typeof page.phase !== 'number' || page.phase < 0 || page.phase > 4) {
        errors.push(`[ERROR] [${page.id}] Page phase must be a number between 0 and 4, found "${page.phase}"`);
      } else {
        if (page.phase < lastPhase) {
          errors.push(`[ERROR] [${page.id}] Page phase ${page.phase} decreases from previous page phase ${lastPhase}`);
        }
        lastPhase = page.phase;
      }

      // --- 3. No "pageNumber" field on any page ---
      if ('pageNumber' in page) {
        errors.push(`[ERROR] [${page.id}] Page contains forbidden field "pageNumber"`);
      }

      // --- 4. Allowed block types & required fields ---
      const allowedBlockTypes = [
        'heading', 'paragraph', 'divider', 'phase-banner', 'consigne', 
        'microtask', 'keywords', 'info-box', 'objectives', 'images-row', 
        'video', 'question', 'submit'
      ];
      
      if (Array.isArray(page.content)) {
        page.content.forEach((block, bIdx) => {
          if (!block || typeof block !== 'object' || !block.type) {
            errors.push(`[ERROR] [${page.id}] Block at index ${bIdx} is invalid or missing "type"`);
            return;
          }
          
          if (!allowedBlockTypes.includes(block.type)) {
            errors.push(`[ERROR] [${page.id}] Unknown block type "${block.type}" at index ${bIdx}`);
            return;
          }
          
          switch (block.type) {
            case 'heading':
              if (typeof block.text !== 'string' || block.text.trim() === '') {
                errors.push(`[ERROR] [${page.id}] Heading block at index ${bIdx} must have non-empty "text"`);
              }
              if (typeof block.level !== 'number') {
                errors.push(`[ERROR] [${page.id}] Heading block at index ${bIdx} must have numeric "level"`);
              }
              break;
            case 'paragraph':
              if (typeof block.text !== 'string' || block.text.trim() === '') {
                errors.push(`[ERROR] [${page.id}] Paragraph block at index ${bIdx} must have non-empty "text"`);
              }
              break;
            case 'divider':
              // No required fields
              break;
            case 'phase-banner':
              if (typeof block.phase !== 'number' || block.phase < 0 || block.phase > 4) {
                errors.push(`[ERROR] [${page.id}] phase-banner block at index ${bIdx} must have "phase" as number in 0..4`);
              }
              if (typeof block.title !== 'string' || block.title.trim() === '') {
                errors.push(`[ERROR] [${page.id}] phase-banner block at index ${bIdx} must have non-empty "title"`);
              }
              break;
            case 'consigne':
              if (typeof block.text !== 'string' || block.text.trim() === '') {
                errors.push(`[ERROR] [${page.id}] Consigne block at index ${bIdx} must have non-empty "text"`);
              }
              break;
            case 'microtask':
              if (typeof block.number !== 'number') {
                errors.push(`[ERROR] [${page.id}] microtask block at index ${bIdx} must have numeric "number"`);
              }
              if (typeof block.text !== 'string' || block.text.trim() === '') {
                errors.push(`[ERROR] [${page.id}] microtask block at index ${bIdx} must have non-empty "text"`);
              }
              break;
            case 'keywords':
              if (typeof block.title !== 'string' || block.title.trim() === '') {
                errors.push(`[ERROR] [${page.id}] keywords block at index ${bIdx} must have non-empty "title"`);
              }
              if (!Array.isArray(block.items) || block.items.some(item => typeof item !== 'string')) {
                errors.push(`[ERROR] [${page.id}] keywords block at index ${bIdx} must have "items" as array of strings`);
              }
              break;
            case 'info-box':
              if (typeof block.title !== 'string' || block.title.trim() === '') {
                errors.push(`[ERROR] [${page.id}] info-box block at index ${bIdx} must have non-empty "title"`);
              }
              if (!Array.isArray(block.sections)) {
                errors.push(`[ERROR] [${page.id}] info-box block at index ${bIdx} must have "sections" array`);
              } else {
                block.sections.forEach((sec, sIdx) => {
                  if (typeof sec.heading !== 'string' || sec.heading.trim() === '') {
                    errors.push(`[ERROR] [${page.id}] info-box section at index ${sIdx} (block ${bIdx}) must have non-empty "heading"`);
                  }
                  if (!Array.isArray(sec.items) || sec.items.some(item => typeof item !== 'string')) {
                    errors.push(`[ERROR] [${page.id}] info-box section at index ${sIdx} (block ${bIdx}) must have "items" as array of strings`);
                  }
                });
              }
              break;
            case 'objectives':
              if (typeof block.title !== 'string' || block.title.trim() === '') {
                errors.push(`[ERROR] [${page.id}] objectives block at index ${bIdx} must have non-empty "title"`);
              }
              if (!Array.isArray(block.items)) {
                errors.push(`[ERROR] [${page.id}] objectives block at index ${bIdx} must have "items" array`);
              } else {
                block.items.forEach((item, iIdx) => {
                  if (typeof item.num !== 'string' || item.num.trim() === '') {
                    errors.push(`[ERROR] [${page.id}] objectives item at index ${iIdx} (block ${bIdx}) must have non-empty "num"`);
                  }
                  if (typeof item.text !== 'string' || item.text.trim() === '') {
                    errors.push(`[ERROR] [${page.id}] objectives item at index ${iIdx} (block ${bIdx}) must have non-empty "text"`);
                  }
                });
              }
              break;
            case 'images-row':
              if (!Array.isArray(block.images) || block.images.length === 0) {
                errors.push(`[ERROR] [${page.id}] images-row block at index ${bIdx} must have non-empty "images" array`);
              } else {
                block.images.forEach((img, imgIdx) => {
                  if (typeof img.imageUrl !== 'string' || img.imageUrl.trim() === '') {
                    errors.push(`[ERROR] [${page.id}] images-row image at index ${imgIdx} (block ${bIdx}) must have non-empty "imageUrl"`);
                  }
                  if (typeof img.caption !== 'string') {
                    errors.push(`[ERROR] [${page.id}] images-row image at index ${imgIdx} (block ${bIdx}) must have "caption" string`);
                  }
                });
              }
              break;
            case 'video':
              if (typeof block.videoUrl !== 'string' || block.videoUrl.trim() === '') {
                errors.push(`[ERROR] [${page.id}] video block at index ${bIdx} must have non-empty "videoUrl"`);
              }
              if (typeof block.caption !== 'string') {
                errors.push(`[ERROR] [${page.id}] video block at index ${bIdx} must have "caption" string`);
              }
              break;
            case 'question':
              if (typeof block.questionId !== 'string' || block.questionId.trim() === '') {
                errors.push(`[ERROR] [${page.id}] question block at index ${bIdx} must have non-empty "questionId"`);
              }
              break;
            case 'submit':
              if (typeof block.lessonId !== 'string' || block.lessonId.trim() === '') {
                errors.push(`[ERROR] [${page.id}] submit block at index ${bIdx} must have non-empty "lessonId"`);
              }
              if (typeof block.lessonTitle !== 'string' || block.lessonTitle.trim() === '') {
                errors.push(`[ERROR] [${page.id}] submit block at index ${bIdx} must have non-empty "lessonTitle"`);
              }
              break;
          }
        });
      }
    }
  }

  // --- 5. Questions checks & Cross-referencing ---
  const qIds = new Set();
  const duplicateQIds = new Set();
  const qTypeMap = new Map();

  if (Array.isArray(lesson.questions)) {
    lesson.questions.forEach((q, qIdx) => {
      if (!q || typeof q !== 'object' || !q.id) {
        errors.push(`[ERROR] Question at index ${qIdx} is invalid or has no id`);
        return;
      }
      if (qIds.has(q.id)) {
        duplicateQIds.add(q.id);
        errors.push(`[ERROR] Duplicate question id "${q.id}" in questions array`);
      }
      qIds.add(q.id);
      qTypeMap.set(q.id, q.type);
      
      const pattern = N ? new RegExp(`^l${N}-(q\\d+|vf\\d+|e\\d+)$`) : /^l\d+-(q\d+|vf\d+|e\d+)$/;
      if (!pattern.test(q.id)) {
        errors.push(`[ERROR] Question id "${q.id}" does not match pattern "^l${N || '\\d+'}-(q\\d+|vf\\d+|e\\d+)$"`);
      }
      
      if (q.type !== 'open-ended' && q.type !== 'vrai-faux' && q.type !== 'multiple-choice') {
        errors.push(`[ERROR] Question "${q.id}" has invalid type "${q.type}" (must be "open-ended", "vrai-faux" or "multiple-choice")`);
      }
      
      if (q.type === 'open-ended') {
        if (typeof q.lines !== 'number') {
          errors.push(`[ERROR] Question "${q.id}" of type "open-ended" is missing numeric "lines" field`);
        } else if (q.lines < 4) {
          errors.push(`[ERROR] Question "${q.id}" of type "open-ended" has lines < 4 (found ${q.lines})`);
        }
      }

      if (q.type === 'vrai-faux') {
        if (!('answer' in q)) {
          errors.push(`[ERROR] Question "${q.id}" of type "vrai-faux" is missing the required "answer" field`);
        } else if (q.answer !== 'vrai' && q.answer !== 'faux') {
          errors.push(`[ERROR] Question "${q.id}" of type "vrai-faux" has invalid answer "${q.answer}" (must be "vrai" or "faux")`);
        }
      }

      if (q.type === 'multiple-choice') {
        if ('lines' in q) {
          errors.push(`[ERROR] Question "${q.id}" of type "multiple-choice" must have NO "lines" field`);
        }
        if (!('answer' in q)) {
          errors.push(`[ERROR] Question "${q.id}" of type "multiple-choice" is missing the required "answer" field`);
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errors.push(`[ERROR] Question "${q.id}" of type "multiple-choice" must have "options" array of length >= 2`);
        } else {
          const optionIds = q.options.map(opt => opt.id);
          if ('answer' in q && !optionIds.includes(q.answer)) {
            errors.push(`[ERROR] Question "${q.id}" has answer "${q.answer}" which is not one of the option ids: [${optionIds.join(', ')}]`);
          }
          q.options.forEach((opt, optIdx) => {
            if (typeof opt.id !== 'string' || opt.id.trim() === '') {
              errors.push(`[ERROR] Question "${q.id}" option at index ${optIdx} must have non-empty string "id"`);
            }
            if (typeof opt.label !== 'string' || opt.label.trim() === '') {
              errors.push(`[ERROR] Question "${q.id}" option at index ${optIdx} must have non-empty string "label"`);
            }
            if (typeof opt.text !== 'string' || opt.text.trim() === '') {
              errors.push(`[ERROR] Question "${q.id}" option at index ${optIdx} must have non-empty string "text"`);
            }
          });
        }
      }
    });
  }

  const blockQuestionRefs = {};
  if (Array.isArray(lesson.pages)) {
    lesson.pages.forEach(page => {
      if (Array.isArray(page.content)) {
        page.content.forEach(block => {
          if (block && block.type === 'question' && block.questionId) {
            blockQuestionRefs[block.questionId] = blockQuestionRefs[block.questionId] || [];
            blockQuestionRefs[block.questionId].push(page.id);
          }
        });
      }
    });
  }

  qIds.forEach(id => {
    const refs = blockQuestionRefs[id];
    if (!refs || refs.length === 0) {
      errors.push(`[ERROR] Question "${id}" is defined in questions array but never referenced by any question block`);
    } else if (refs.length > 1) {
      errors.push(`[ERROR] Question "${id}" is referenced multiple times (on pages: ${refs.join(', ')})`);
    }
  });

  Object.keys(blockQuestionRefs).forEach(id => {
    if (!qIds.has(id)) {
      const pages = blockQuestionRefs[id];
      errors.push(`[ERROR] Question block references unknown question id "${id}" on page(s): ${pages.join(', ')}`);
    }
  });

  // --- 6. Emojis checks ---
  const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}📌📝👉➤✅❌]/u;
  const hasEmoji = (str) => typeof str === 'string' && EMOJI_REGEX.test(str);

  if (Array.isArray(lesson.pages)) {
    lesson.pages.forEach(page => {
      if (hasEmoji(page.title)) {
        warnings.push(`[WARN] Emoji found in page title: "${page.title}" on page ${page.id}`);
      }
      
      if (Array.isArray(page.content)) {
        page.content.forEach((block, bIdx) => {
          if (!block || typeof block !== 'object') return;
          
          if (block.type === 'heading' || block.type === 'consigne' || block.type === 'microtask') {
            if (hasEmoji(block.text)) {
              errors.push(`[ERROR] [${page.id}] Emoji found in forbidden block "${block.type}" text: "${block.text}"`);
            }
          } else {
            if (block.type === 'paragraph' && hasEmoji(block.text)) {
              warnings.push(`[WARN] [${page.id}] Emoji found in paragraph text: "${block.text}"`);
            }
            if (block.type === 'phase-banner' && hasEmoji(block.title)) {
              warnings.push(`[WARN] [${page.id}] Emoji found in phase-banner title: "${block.title}"`);
            }
            if (block.type === 'keywords') {
              if (hasEmoji(block.title)) {
                warnings.push(`[WARN] [${page.id}] Emoji found in keywords title: "${block.title}"`);
              }
              if (Array.isArray(block.items)) {
                block.items.forEach(item => {
                  if (hasEmoji(item)) {
                    warnings.push(`[WARN] [${page.id}] Emoji found in keywords item: "${item}"`);
                  }
                });
              }
            }
            if (block.type === 'info-box') {
              if (hasEmoji(block.title)) {
                warnings.push(`[WARN] [${page.id}] Emoji found in info-box title: "${block.title}"`);
              }
              if (Array.isArray(block.sections)) {
                block.sections.forEach(sec => {
                  if (hasEmoji(sec.heading)) {
                    warnings.push(`[WARN] [${page.id}] Emoji found in info-box section heading: "${sec.heading}"`);
                  }
                  if (Array.isArray(sec.items)) {
                    sec.items.forEach(item => {
                      if (hasEmoji(item)) {
                        warnings.push(`[WARN] [${page.id}] Emoji found in info-box section item: "${item}"`);
                      }
                    });
                  }
                });
              }
            }
            if (block.type === 'objectives') {
              if (hasEmoji(block.title)) {
                warnings.push(`[WARN] [${page.id}] Emoji found in objectives title: "${block.title}"`);
              }
              if (Array.isArray(block.items)) {
                block.items.forEach(item => {
                  if (hasEmoji(item.text)) {
                    warnings.push(`[WARN] [${page.id}] Emoji found in objectives item text: "${item.text}"`);
                  }
                });
              }
            }
            if (block.type === 'images-row' && Array.isArray(block.images)) {
              block.images.forEach(img => {
                if (hasEmoji(img.caption)) {
                  warnings.push(`[WARN] [${page.id}] Emoji found in image caption: "${img.caption}"`);
                }
              });
            }
            if (block.type === 'video' && hasEmoji(block.caption)) {
              warnings.push(`[WARN] [${page.id}] Emoji found in video caption: "${block.caption}"`);
            }
            if (block.type === 'submit' && hasEmoji(block.lessonTitle)) {
              warnings.push(`[WARN] [${page.id}] Emoji found in submit lesson title: "${block.lessonTitle}"`);
            }
          }
        });
      }
    });
  }

  if (Array.isArray(lesson.questions)) {
    lesson.questions.forEach(q => {
      if (q && hasEmoji(q.text)) {
        warnings.push(`[WARN] Emoji found in question "${q.id}" text: "${q.text}"`);
      }
    });
  }

  // --- 7. Budget Heuristics ---
  if (Array.isArray(lesson.pages)) {
    lesson.pages.forEach(page => {
      if (!Array.isArray(page.content)) return;
      
      let openEndedCount = 0;
      let vraiFauxCount = 0;
      let paragraphCount = 0;
      let hasInfoBox = false;
      let hasVideo = false;
      
      page.content.forEach(block => {
        if (!block) return;
        if (block.type === 'paragraph') paragraphCount++;
        if (block.type === 'info-box') hasInfoBox = true;
        if (block.type === 'video') hasVideo = true;
        
        if (block.type === 'question') {
          const qType = qTypeMap.get(block.questionId);
          if (qType === 'open-ended' || qType === 'multiple-choice') openEndedCount++;
          if (qType === 'vrai-faux') vraiFauxCount++;
        }
      });
      
      if (openEndedCount > 2) {
        warnings.push(`[WARN] [${page.id}] Budget warning: more than 2 open-ended question blocks on a single page (${openEndedCount})`);
      }
      
      if (openEndedCount > 0) {
        const nonQuestionOtherBlocks = page.content.filter(block => {
          if (!block) return false;
          return block.type !== 'question' && block.type !== 'heading' && block.type !== 'consigne';
        });
        if (nonQuestionOtherBlocks.length >= 2) {
          warnings.push(`[WARN] [${page.id}] Budget warning: open-ended question shares page with 2+ non-question blocks besides heading/consigne (found other types: ${nonQuestionOtherBlocks.map(b => b.type).join(', ')})`);
        }
      }
      
      if (vraiFauxCount > 3) {
        warnings.push(`[WARN] [${page.id}] Budget warning: more than 3 vrai-faux question blocks on a single page (${vraiFauxCount})`);
      }
      
      if (paragraphCount > 4) {
        warnings.push(`[WARN] [${page.id}] Budget warning: more than 4 paragraph blocks on a single page (${paragraphCount})`);
      }
      
      if (hasInfoBox) {
        const otherBlocks = page.content.filter(block => {
          if (!block) return false;
          return block.type !== 'info-box' && block.type !== 'heading';
        });
        if (otherBlocks.length > 0) {
          warnings.push(`[WARN] [${page.id}] Budget warning: info-box shares page with other blocks except heading (found types: ${otherBlocks.map(b => b.type).join(', ')})`);
        }
      }
      
      page.content.forEach((block, bIdx) => {
        if (block && block.type === 'objectives' && Array.isArray(block.items)) {
          if (block.items.length > 6) {
            warnings.push(`[WARN] [${page.id}] Budget warning: objectives block at index ${bIdx} has more than 6 items (${block.items.length})`);
          }
        }
      });
      
      if (hasVideo) {
        const nonVideoBlocks = page.content.filter(block => block && block.type !== 'video');
        const allowedTypes = ['microtask', 'consigne', 'heading'];
        
        const hasDisallowed = nonVideoBlocks.some(b => !allowedTypes.includes(b.type));
        const hasMultipleOfSame = (() => {
          const counts = {};
          for (const b of nonVideoBlocks) {
            counts[b.type] = (counts[b.type] || 0) + 1;
          }
          return Object.values(counts).some(c => c > 1);
        })();
        
        if (hasDisallowed || hasMultipleOfSame || nonVideoBlocks.length > 1) {
          warnings.push(`[WARN] [${page.id}] Budget warning: video shares page with multiple or disallowed blocks (found types: ${nonVideoBlocks.map(b => b.type).join(', ')})`);
        }
      }
    });
  }

  // --- 8. Submit block check ---
  if (Array.isArray(lesson.pages) && lesson.pages.length > 0) {
    const lastPageIdx = lesson.pages.length - 1;
    
    lesson.pages.forEach((page, pageIdx) => {
      if (!Array.isArray(page.content)) return;
      
      page.content.forEach((block, bIdx) => {
        if (block && block.type === 'submit') {
          if (pageIdx !== lastPageIdx) {
            errors.push(`[ERROR] [${page.id}] Submit block found at index ${bIdx} on page ${pageIdx + 1}, but it is only allowed on the last page (${lastPageIdx + 1})`);
          }
          if (block.lessonId !== lesson.id) {
            errors.push(`[ERROR] [${page.id}] Submit block lessonId "${block.lessonId}" does not match lesson id "${lesson.id}"`);
          }
        }
      });
    });
    
    const lastPage = lesson.pages[lastPageIdx];
    const hasSubmit = Array.isArray(lastPage.content) && lastPage.content.some(b => b && b.type === 'submit');
    if (!hasSubmit) {
      errors.push(`[ERROR] [${lastPage.id}] Last page is missing the required "submit" block`);
    }
  }

  finishValidation(errors, warnings);
}

main().catch(err => {
  console.error(`ERROR: Unexpected script failure: ${err.stack || err.message}`);
  process.exit(1);
});
