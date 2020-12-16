/**
 * @description Block tests
 */
/* global Test, page, SERVER */
/* eslint no-global-assign:0 */
'use strict';

const utils = require('../commonUtils');

const BLOCK_CATEGORIES = utils.getCategoryList();
/**
 * Parse all defined blocks from BLOCK_CATEGORIES
 */
const BLOCKS = (function () {
  const result = {};
  BLOCK_CATEGORIES.map(category => {
    result[category] = utils.parseBlockCategoryFile(category);
  });
  return result;
})();

/**
 * Load block messages mapping
 */
const BLOCK_MSG_MAPPINGS = JSON.parse(utils.readFileSync(utils.PATHS.MESSAGE_MAPPING).toString());

/**
 * Check if everything exists on filesystem level
 */
describe('Filesystem Block tests', () => {
  test('Block Messages exists in i18n/strings_to_json_mapping.json', () => {
    Object.keys(BLOCKS).forEach(categoryName => {
      Object.keys(BLOCKS[categoryName]).forEach(blockName => {
        const block = BLOCKS[categoryName][blockName];
        const blockMsg = block.message0;
        const blockMsgName = blockMsg.substring(6, blockMsg.length - 1);
        // verify if it exists
        expect(BLOCK_MSG_MAPPINGS[blockMsgName]).not.toBeUndefined();

        const defArgs = Object.keys(block).filter(key => {
          if (key.indexOf('args') > -1) {
            if (block[key].length === 0) {
              return false;
            }
            return ['field_dropdown', 'field_number', 'field_input'].includes(block[key][0]['type']);
          }
          return false;
        });
        const msgArgs = BLOCK_MSG_MAPPINGS[blockMsgName].match(/%\d+/) || [];
        if (blockName === 'ParameterizedBrick') {
          const blockMsg2 = block.message2;
          const blockMsgName2 = blockMsg2.substring(6, blockMsg2.length - 1);
          msgArgs.push(BLOCK_MSG_MAPPINGS[blockMsgName2].match(/%\d+/) || []);
        }
        expect(defArgs.length).toBe(msgArgs.length);
      });
    });
  });

  test('Block argsCount match with i18n/strings_to_json_mapping.json', () => {
    Object.keys(BLOCKS).forEach(categoryName => {
      Object.keys(BLOCKS[categoryName]).forEach(blockName => {
        const block = BLOCKS[categoryName][blockName];
        const blockMsg = block.message0;
        const blockMsgName = blockMsg.substring(6, blockMsg.length - 1);

        const defArgs = Object.keys(block).filter(key => {
          if (key.indexOf('args') > -1) {
            if (block[key].length === 0) {
              return false;
            }
            return ['field_dropdown', 'field_number', 'field_input'].includes(block[key][0]['type']);
          }
          return false;
        });
        const msgArgs = BLOCK_MSG_MAPPINGS[blockMsgName].match(/%\d+/) || [];
        if (blockName === 'ParameterizedBrick') {
          const blockMsg2 = block.message2;
          const blockMsgName2 = blockMsg2.substring(6, blockMsg2.length - 1);
          msgArgs.push(BLOCK_MSG_MAPPINGS[blockMsgName2].match(/%\d+/) || []);
        }
        expect(defArgs.length).toBe(msgArgs.length);
      });
    });
  });
});

describe('WebView Block tests', () => {
  beforeAll(async () => {
    await page.goto(`${SERVER}`, { waitUntil: 'networkidle0' });
    page.on('console', message => console.log(message.text()));
    page.evaluate(() => {
      // function to JSON.stringify circular objects
      window.shallowJSON = (obj, indent = 2) => {
        let cache = [];
        const retVal = JSON.stringify(
          obj,
          (key, value) =>
            typeof value === "object" && value !== null
              ? cache.includes(value)
                ? undefined // Duplicate reference found, discard key
                : cache.push(value) && value // Store value in our collection
              : value,
          indent
        );
        cache = null;
        return retVal;
      };
    });
  });

  describe('Workspace initialization', () => {
    beforeEach(async () => {
      // clean workspace before each test
      await page.evaluate(() => {
        Test.Playground.workspace.clear();
      });
    });

    test('Playground workspace is loaded', async () => {
      const workspaceJSON = await page.evaluate(() => {
        return window.shallowJSON(Test.Playground.workspace);
      });
      const workspace = JSON.parse(workspaceJSON);
      const result = workspace != null && workspace instanceof Object;
      expect(result).toBeTruthy();
    });

    test('Playground blockDB is empty', async () => {
      const blocksJSON = await page.evaluate(() => {
        return window.shallowJSON(Test.Playground.workspace.blockDB_);
      });
      const blocks = JSON.parse(blocksJSON);
      const result = Object.keys(blocks).length === 0;
      expect(result).toBeTruthy();
    });

    test('Playground toolbox workspace is loaded', async () => {
      const workspaceJSON = await page.evaluate(() => {
        return window.shallowJSON(Test.Toolbox.workspace);
      });
      const workspace = JSON.parse(workspaceJSON);
      const result = workspace != null && workspace instanceof Object;
      expect(result).toBeTruthy();
    });

    test('Playground toolbox blockDB is not empty', async () => {
      const blockJSON = await page.evaluate(() => {
        if (!Test.Toolbox.workspace) {
          return false;
        }
        return window.shallowJSON(Test.Toolbox.workspace.blockDB_);
      });
      
      let result = false;
      try {
        const block = JSON.parse(blockJSON);
        result = Object.keys(block).length !== 0;
      } catch (e) {
        result = false;
      }
      expect(result).toBeTruthy();
    });

    test('Blockly loaded all categories', async () => {
      const blockJSON = await page.evaluate(() => {
        return window.shallowJSON(Test.Blockly.Categories);
      });
      let result = true;
      try {
        const blocksCategories = JSON.parse(blockJSON);
        for (const cat of BLOCK_CATEGORIES) {
          if (!blocksCategories[cat]) {
            result = false;
            break;
          }
        }
      } catch (e) {
        result = false;
      }
      expect(result).toBeTruthy();
    });

    test('Blockly includes all blocks', async () => {
      const blockJSON = await page.evaluate(() => {
        return window.shallowJSON(Test.Blockly.Bricks);
      });
      let result = true;

      try {
        const bricks = JSON.parse(blockJSON);
        
        const allBlocks = (() => {
          const blocks = [];
          Object.keys(BLOCKS).forEach(categoryName => {
            Object.keys(BLOCKS[categoryName]).forEach(blockName => {
              blocks.push(blockName);
            });
          });
          return blocks;
        })();

        for (const blockName of allBlocks) {
          if (bricks[blockName] == null) {
            result = false;
            break;
          }
        }
      } catch (e) {
        result = false;
      }

      expect(result).toBeTruthy();
    });

    test('All Blocks exists in Toolbox', async () => {
      const allBlocks = (() => {
        const blocks = [];
        Object.keys(BLOCKS).forEach(categoryName => {
          Object.keys(BLOCKS[categoryName]).forEach(blockName => {
            blocks.push(blockName);
          });
        });
        return blocks;
      })();

      const result = await page.evaluate(allBlocks => {
        for (const blockName of allBlocks) {
          if (Test.Toolbox.workspace.getBlocksByType(blockName).length === 0) {
            return false;
          }
        }
        return true;
      }, allBlocks);
      expect(result).toBeTruthy();
    });
  });

  describe('Workspace actions', () => {
    test('All icons available and rendered', async () => {
      const imgHref = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('svg.blocklyFlyout image')).map(node => node.href.baseVal);
      });

      const statusCodes = await page.evaluate(async (hrefs) => {
        const codes = [];
        for (const href of hrefs) {
          const res = await fetch(href);
          codes.push(res.status);
        }
        return codes;
      }, imgHref);

      const result = statusCodes.includes(404);

      expect(result).toBeFalsy();
    });

    test('formula blocks (without child) are rendered properly', async () => {
      const languageToTest = 'en';
      const languageObject = JSON.parse(utils.readFileSync(`${utils.PATHS.CATBLOCKS_MSGS}${languageToTest}.json`));
      const blockText = languageObject['LOOKS_CHANGEBRIGHTHNESSBY'].replace('%1', '').replace('%2', '').trim();

      const [ blockFieldValue, refValue, value ] = await page.evaluate(() => {
        const block = Test.Playground.workspace.newBlock('ChangeBrightnessByNBrick');
        block.initSvg();
        block.render(false);
        //get default scale value
        const refValue = Test.Blockly.Bricks['ChangeBrightnessByNBrick'].args0[0].text;
        const value = block.inputList[0].fieldRow[1].getText();

        return [
          block.getFieldValue(), refValue, value 
        ];
      });
      const result = blockFieldValue === blockText && refValue === value;
      expect(result).toBeTruthy();
    });

    test('formula blocks (with left child) are rendered properly', async () => {
      const languageToTest = 'en';
      const languageObject = JSON.parse(utils.readFileSync(`${utils.PATHS.CATBLOCKS_MSGS}${languageToTest}.json`));
      const blockText = languageObject['LOOKS_CHANGEBRIGHTHNESSBY'].replace('%1', '').replace('%2', '').trim();

      const valueToSet = '-1';

      const [ blockFieldValue, value ] = await page.evaluate(pValue => {
        const block = Test.Playground.workspace.newBlock('ChangeBrightnessByNBrick');
        block.initSvg();
        block.render(false);
        //set scale value
        
        block.inputList[0].fieldRow[1].setValue(pValue);
        const value = block.inputList[0].fieldRow[1].getValue().toString();
        return [
          block.getFieldValue(), value 
        ];
      }, valueToSet);
      const result = (blockFieldValue === blockText && valueToSet === value);
      expect(result).toBeTruthy();
    });

    test('formula blocks (with left and right child) are rendered properly', async () => {
      const languageToTest = 'en';
      const languageObject = JSON.parse(utils.readFileSync(`${utils.PATHS.CATBLOCKS_MSGS}${languageToTest}.json`));
      const blockText = languageObject['CONTROL_WAIT'].trim();

      const valueToSet = '37';
      const desiredBlockText = blockText.replace('%1', valueToSet).replace('%2', '').replace(/\s/g, '');

      const [ value, blockContent ] = await page.evaluate(pValue => {
        const block = Test.Playground.workspace.newBlock('WaitBrick');
        block.initSvg();
        block.render(false);
        //set scale value
        
        block.inputList[0].fieldRow[1].setValue(pValue);
        const value = block.inputList[0].fieldRow[1].getValue().toString();
        
        //check if field text matches when block is in workspace
        return [ value, block.svgGroup_.textContent.replace(/\s/g, '') ];
      }, valueToSet);
      const result = (valueToSet === value && desiredBlockText === blockContent);
      expect(result).toBeTruthy();
    });

    test('check if zebra is working properly', async () => {
      const [ color1, color2, color3 ] = await page.evaluate(() => {
        const topBlock = Test.Playground.workspace.newBlock('WaitBrick');
        topBlock.childBlocks_.push(Test.Playground.workspace.newBlock('WaitBrick'));
        topBlock.childBlocks_[0].childBlocks_.push(Test.Playground.workspace.newBlock('WaitBrick'));
        topBlock.childBlocks_[0].childBlocks_[0].childBlocks_.push(Test.Playground.workspace.newBlock('WaitBrick'));
        Test.Playground.zebra();
        return [
          topBlock.colour_, topBlock.childBlocks_[0].colour_, topBlock.childBlocks_[0].childBlocks_[0].colour_];
      });

      const result = (color1 === color3 &&
        color1 !== color2);

      expect(result).toBeTruthy();
    });
    
    test('Block arguments are rendered properly', async () => {

      const allRenderedBlocksJSON = await page.evaluate(() => {
        const blocks = Test.Toolbox.workspace.getAllBlocks();

        const returnArray = [];
        for (const block of blocks) {
          returnArray.push(block.svgGroup_.querySelectorAll('g.blocklyEditableText'));
        }
        return window.shallowJSON(returnArray);
      });

      let result = true;
      const allRenderedBlocks = JSON.parse(allRenderedBlocksJSON);
      for (const renderedBlock of allRenderedBlocks) {
  
        let returnStatus = false;
        for (const categoryName in BLOCKS) {
          if (Object.hasOwnProperty.call(BLOCKS, categoryName)) {
  
            for (const blockName in BLOCKS[categoryName]) {
              if (Object.hasOwnProperty.call(BLOCKS[categoryName], blockName)) {
  
                const jsBlock = BLOCKS[categoryName][blockName];
                
                //get args from js-files (in blocks/categories directory)
                const allJsArguments = [];
                if (jsBlock['args0'] !== undefined) {
                  let jsBlockIndex = 0;
                  while (jsBlock['args0'][jsBlockIndex] !== undefined) {
                    if (jsBlock['args0'][jsBlockIndex]['value'] !== undefined) {
                      allJsArguments.push(jsBlock['args0'][jsBlockIndex]['value']);
                    }
                    if (jsBlock['args0'][jsBlockIndex]['text'] !== undefined) {
                      allJsArguments.push(jsBlock['args0'][jsBlockIndex]['text']);
                    }
                    if (jsBlock['args0'][jsBlockIndex]['options'] !== undefined) {
                      allJsArguments.push(jsBlock['args0'][jsBlockIndex]['options'][0][0]);
                    }
                    jsBlockIndex++;
                  }
                }
                if (jsBlock['args2'] !== undefined) {
                  let jsBlockIndex = 0;
                  while (jsBlock['args2'][jsBlockIndex] !== undefined) {
                    if (jsBlock['args2'][jsBlockIndex]['value'] !== undefined) {
                      allJsArguments.push(jsBlock['args2'][jsBlockIndex]['value']);
                    }
                    if (jsBlock['args2'][jsBlockIndex]['text'] !== undefined) {
                      allJsArguments.push(jsBlock['args2'][jsBlockIndex]['text']);
                    }
                    if (jsBlock['args2'][jsBlockIndex]['options'] !== undefined) {
                      allJsArguments.push(jsBlock['args2'][jsBlockIndex]['options'][0][0]);
                    }
                    jsBlockIndex++;
                  }
                }
                if (allJsArguments.length !== Object.keys(renderedBlock).length) {
                  continue;
                }
  
                let check = true;
                //check if rendered arguments and js arguments are equal
                for (let argIndex = 0; argIndex < renderedBlock.length; argIndex++) {
                  const jsArgument = allJsArguments[argIndex].toString().trim().replace(/\s/g, ' ');
                  const renderedArgument = renderedBlock[argIndex].textContent.trim().replace(/\s/g, ' ');
                  if (jsArgument !== renderedArgument) {
                    check = false;
                  }
                }
                if (!check) {
                  continue;
                }

                returnStatus = true;
                break;
              }
            }

            if (returnStatus) {
              break;
            }
          }
        }

        if (!returnStatus) {
          result = false;
          break;
        }
      }

      expect(result).toBeTruthy();
    });
  });
});
