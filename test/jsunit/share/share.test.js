/**
 * @description Share test
 */
/* global page, SERVER, Test, shareTestContainer */
/* eslint no-global-assign:0 */
'use strict';

beforeEach(async () => {
  await page.goto(`${SERVER}`, { waitUntil: 'networkidle0' });
  page.on('console', message => console.log(message.text()));
  await page.evaluate(() => {
    shareTestContainer = document.getElementById('shareprogs');
    shareTestContainer.innerHTML = '';
  });
});

describe('Share basic tests', () => {
  test('Share renders scene container properly', async () => {
    const nameOfTheScene = 'Name of the scene';
    const sceneID = 'sceneID';
    const accordionID = 'accordionID';
    const accordionObjID = `${sceneID}-accordionObjects`;

    await page.evaluate((pNameOfTheScene, pSceneID, pAccordionID) => {
      Test.Share.addSceneContainer(pAccordionID, pSceneID, shareTestContainer, {
        real: pNameOfTheScene,
        display: pNameOfTheScene
      });
    }, nameOfTheScene, sceneID, accordionID);

    const accordionContainerHandle = await page.$(`#${accordionObjID}`);
    const cardBodyHandle = (await accordionContainerHandle.$x('..'))[0];
    const sceneObjContainerHandle = (await cardBodyHandle.$x('..'))[0];
    const sceneContainerHandle = (await sceneObjContainerHandle.$x('..'))[0];

    const realAccordionObjID = await (await accordionContainerHandle.getProperty('id')).jsonValue();    
    expect(realAccordionObjID).toEqual(accordionObjID);

    const realSceneID = await (await sceneContainerHandle.getProperty('id')).jsonValue();    
    expect(realSceneID).toEqual(sceneID);

    const sceneContainerClass = await (await sceneContainerHandle.getProperty('className')).jsonValue();    
    expect(sceneContainerClass).toEqual('catblocks-scene card');

    const sceneContainerInnerText = await sceneContainerHandle.$eval(`#${sceneID}-header`, x => x.innerText);
    expect(sceneContainerInnerText.startsWith(nameOfTheScene)).toBeTruthy();

    const sceneContainerTarget = await sceneContainerHandle.$eval(`#${sceneID}-header`, x => x.getAttribute('data-target'));
    expect(sceneContainerTarget).toEqual(`#${sceneID}-collapseOne`);

    const catblocksObjContainerHandle = sceneContainerHandle.$('.catblocks-object-container');  
    expect(catblocksObjContainerHandle).not.toBeNull();

    const sceneObjContainerParentAttr = await sceneContainerHandle.$eval(`#${sceneID}-collapseOne`, x => x.getAttribute('data-parent'));
    expect(sceneObjContainerParentAttr).toEqual(`#${accordionID}`);
  });

  test('Share renders object container properly', async () => {
    const containerID = 'container-div';
    const objectCardID = 'tobject';
    const objectName = 'objectName';
    const sceneObjectsID = 'sceneID-accordionObjects';

    await page.evaluate((pContainerID, pObjectCardID, pObjectName, pSceneObjectsID) => {
      const container = document.createElement('div');
      container.setAttribute("id", pContainerID);
      shareTestContainer.append(container);

      Test.Share.renderObjectJSON(pObjectCardID, pSceneObjectsID, container, { name: pObjectName });
    }, containerID, objectCardID, objectName, sceneObjectsID);

    const containerHandle = await page.$(`#${containerID}`);

    const objectCardHandle = await containerHandle.$(`*:first-child`);
    const realObjectCardID = await (await objectCardHandle.getProperty('id')).jsonValue(); 
    expect(realObjectCardID).toEqual(objectCardID);

    const objectCardClass = await (await objectCardHandle.getProperty('className')).jsonValue(); 
    expect(objectCardClass).toEqual('catblocks-object card');

    const objectHeaderText = await containerHandle.$eval(`#${objectCardID}-header`, x => x.innerText);
    expect(objectHeaderText.startsWith(objectName)).toBeTruthy();

    const dataParent = await containerHandle.$eval(`#${objectCardID}-collapseOneScene`, x => x.getAttribute('data-parent'));
    expect(dataParent).toEqual(`#${sceneObjectsID}`);

    const tabContent = await containerHandle.$('.tab-content');
    expect(tabContent).not.toBeNull();

    const tabsContainer = await containerHandle.$(`#${objectCardID}-tabs`);
    expect(tabsContainer).not.toBeNull();

    async function checkTabs(id) {
      const container = await containerHandle.$(id);
      expect(container).not.toBeNull();

      const href = await (await container.getProperty('href')).jsonValue(); 
      const anchor = href.split('/').pop();
      const anchorItem = await containerHandle.$(anchor);
      expect(anchorItem).not.toBeNull();
    }

    await checkTabs(`#${objectCardID}-scripts-tab`);
    await checkTabs(`#${objectCardID}-looks-tab`);
    await checkTabs(`#${objectCardID}-sounds-tab`);
  });
});

describe('Share catroid program rendering tests', () => {
  test('Share render unsupported version properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = undefined;

        try {
          Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
          return false;
        } catch (e) {
          return (
            e.message === 'Empty program found' &&
            shareTestContainer.querySelector('.card-header').innerText === 'Empty program found'
          );
        }
      })
    ).toBeTruthy();
  });

  test('Share render an empty program properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {};

        try {
          Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
          return false;
        } catch (e) {
          return (
            e.message === 'Empty program found' &&
            shareTestContainer.querySelector('.card-header').innerText === 'Empty program found'
          );
        }
      })
    ).toBeTruthy();
  });

  test('Share render a single empty scene properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene'
            },
            {
              name: 'testscene2'
            }
          ]
        };

        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);

        return (
          shareTestContainer.querySelector('.catblocks-scene') !== null &&
          shareTestContainer.querySelector('.catblocks-scene-header').innerHTML.length > 0 &&
          shareTestContainer.querySelector('.catblocks-object-container') !== null &&
          shareTestContainer.querySelector('.accordion') !== null &&
          shareTestContainer.querySelector('.catblocks-object .card-header') !== null &&
          shareTestContainer.querySelector('.catblocks-object .card-header').innerHTML.startsWith('No objects found')
        );
      })
    ).toBeTruthy();
  });

  test('Share render multiple empty scenes properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene1'
            },
            {
              name: 'testscene2'
            }
          ]
        };

        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);

        return (
          shareTestContainer.querySelector('.catblocks-scene') !== null &&
          shareTestContainer.querySelector('.catblocks-scene-header').innerHTML.length > 0 &&
          shareTestContainer.querySelector('.catblocks-object-container') !== null &&
          shareTestContainer.querySelector('.accordion') !== null &&
          shareTestContainer.getElementsByClassName('catblocks-object').length === 2 &&
          shareTestContainer.querySelector('.catblocks-object .card-header').innerHTML.startsWith('No objects found')
        );
      })
    ).toBeTruthy();
  });

  test('Share render a single empty object properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene',
              objectList: [
                {
                  name: 'tobject'
                }
              ]
            }
          ]
        };

        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);

        return (
          shareTestContainer.querySelector('.catblocks-object .card-header') !== null &&
          shareTestContainer
            .querySelector('.catblocks-object .card-header')
            .innerHTML.startsWith('<div class="header-title">tobject</div>') &&
          shareTestContainer.querySelector('.tab-pane') !== null &&
          shareTestContainer.querySelector('.catblocks-script') === null
        );
      })
    ).toBeTruthy();
  });

  test('Share render multiple empty objects in same scene', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene',
              objectList: [
                {
                  name: 'tobject1'
                },
                {
                  name: 'tobject2'
                }
              ]
            },
            {
              name: 'testscene2'
            }
          ]
        };

        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
        const sceneHeader = shareTestContainer.querySelector('.catblocks-scene-header');
        sceneHeader.click();

        const sceneID = Test.ShareUtils.generateID('programID-testscene');
        const obj1ID = Test.ShareUtils.generateID('programID-testscene-tobject1');
        const obj2ID = Test.ShareUtils.generateID('programID-testscene-tobject2');

        return (
          shareTestContainer.querySelector('#' + Test.ShareUtils.generateID('programID')) !== null &&
          shareTestContainer.querySelector('#' + sceneID) !== null &&
          shareTestContainer.querySelector('#' + obj1ID + '-scripts-tab') !== null &&
          shareTestContainer.querySelector('#' + obj1ID + '-looks') !== null &&
          shareTestContainer.querySelector('#' + obj1ID + '-sounds .catblocks-empty-text') !== null &&
          shareTestContainer.querySelector('#' + obj2ID + '-scripts-tab') !== null &&
          shareTestContainer.querySelector('#' + obj2ID + '-looks') !== null &&
          shareTestContainer.querySelector('#' + obj2ID + '-sounds .catblocks-empty-text') !== null
        );
      })
    ).toBeTruthy();
  });

  test('Share render empty objects in different scenes', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene1',
              objectList: [
                {
                  name: 'tobject1'
                }
              ]
            },
            {
              name: 'testscene2',
              objectList: [
                {
                  name: 'tobject2'
                }
              ]
            }
          ]
        };

        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
        const scene1ID = Test.ShareUtils.generateID('programID-testscene1');
        const scene2ID = Test.ShareUtils.generateID('programID-testscene2');
        shareTestContainer.querySelector('#' + scene1ID).click();
        shareTestContainer.querySelector('#' + scene2ID).click();
        const obj1ID = Test.ShareUtils.generateID('programID-testscene1-tobject1');
        const obj2ID = Test.ShareUtils.generateID('programID-testscene2-tobject2');

        return (
          shareTestContainer.querySelector('#' + Test.ShareUtils.generateID('programID')) !== null &&
          shareTestContainer.querySelector('#' + scene1ID) !== null &&
          shareTestContainer.querySelector('#' + scene2ID) !== null &&
          shareTestContainer.querySelector('#' + obj1ID + '-scripts-tab') !== null &&
          shareTestContainer.querySelector('#' + obj1ID + '-looks') !== null &&
          shareTestContainer.querySelector('#' + obj1ID + '-sounds') !== null &&
          shareTestContainer.querySelector('#' + obj1ID + '-sounds .catblocks-empty-text') !== null &&
          shareTestContainer.querySelector('#' + obj2ID + '-scripts-tab') !== null &&
          shareTestContainer.querySelector('#' + obj2ID + '-looks') !== null &&
          shareTestContainer.querySelector('#' + obj2ID + '-sounds') !== null &&
          shareTestContainer.querySelector('#' + obj2ID + '-sounds .catblocks-empty-text') !== null
        );
      })
    ).toBeTruthy();
  });

  test('Share render script svg', async () => {
    expect(
      await page.evaluate(() => {
        const scriptJSON = {
          name: 'StartScript',
          brickList: [
            {
              name: 'SetXBrick',
              loopOrIfBrickList: [],
              elseBrickList: [],
              formValues: {},
              colorVariation: 0
            }
          ],
          formValues: {}
        };
        const svg = Test.Share.domToSvg(scriptJSON);
        return (
          svg.textContent.replace(/\s/g, ' ').includes('When scene starts') &&
          svg.textContent.replace(/\s/g, ' ').includes('Set x to') &&
          svg.textContent.replace(/\s/g, ' ').includes('unset')
        );
      })
    ).toBeTruthy();
  });

  test('Share render svg script box properly', async () => {
    expect(
      await page.evaluate(() => {
        const scriptJSON = {
          name: 'StartScript',
          brickList: [
            {
              name: 'SetXBrick',
              loopOrIfBrickList: [],
              elseBrickList: [],
              formValues: {},
              colorVariation: 0
            }
          ],
          formValues: {}
        };
        const svg = Test.Share.domToSvg(scriptJSON);
        return (
          svg !== null &&
          svg.textContent.replace(/\s/g, ' ').includes('When scene starts') &&
          svg.textContent.replace(/\s/g, ' ').includes('Set x to') &&
          svg.textContent.replace(/\s/g, ' ').includes('unset') &&
          svg.getAttribute('width').replace('px', '') > 0 &&
          svg.getAttribute('height').replace('px', '') > 0
        );
      })
    ).toBeTruthy();
  });

  test('Share render single empty scriptlist properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene',
              objectList: [
                {
                  name: 'tobject',
                  scriptList: [
                    {
                      'not-supported': 'yet (takes script from XML)'
                    }
                  ]
                }
              ]
            }
          ]
        };
        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
        const objID = Test.ShareUtils.generateID('programID-testscene-tobject');
        return (
          shareTestContainer.querySelector(
            '#' + objID + ' #' + objID + '-scripts .catblocks-script svg.catblocks-svg'
          ) !== null
        );
      })
    ).toBeTruthy();
  });

  test('Share render object with sound', async () => {
    expect(
      await page.evaluate(() => {
        const testDisplayName = 'Silence Sound';
        const catObj = {
          scenes: [
            {
              name: 'testscene',
              objectList: [
                {
                  name: 'tobject',
                  soundList: [
                    {
                      name: testDisplayName,
                      fileName: 'silence.mp3'
                    }
                  ]
                }
              ]
            }
          ]
        };

        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);

        const objID = Test.ShareUtils.generateID('programID-testscene-tobject');
        return (
          shareTestContainer.querySelector('#' + objID + ' #' + objID + '-sounds .catblocks-object-sound-name') !=
            null &&
          shareTestContainer.querySelector('#' + objID + ' #' + objID + '-sounds .catblocks-object-sound-name')
            .innerHTML === testDisplayName
        );
      })
    ).toBeTruthy();
  });

  test('JSON object has a script', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene',
              objectList: [
                {
                  name: 'tobject',
                  scriptList: [
                    {
                      'not-supported': 'yet (takes script from XML)'
                    }
                  ]
                }
              ]
            }
          ]
        };
        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
        const objID = Test.ShareUtils.generateID('programID-testscene-tobject');
        const executeQuery = shareTestContainer.querySelector(
          '#' + objID + ' #' + objID + '-scripts .catblocks-script svg.catblocks-svg'
        );
        return Object.keys(executeQuery).length === 0;
      })
    ).toBeTruthy();
  });

  test('Share test lazy loading of images', async () => {
    await page.evaluate(() => {
      const testDisplayName = 'My actor';
      const catObj = {
        scenes: [
          {
            name: 'testscene',
            objectList: [
              {
                name: 'tobject',
                lookList: [
                  {
                    name: testDisplayName,
                    fileName: 'My actor or object.png'
                  }
                ]
              }
            ]
          },
          {
            name: 'testscene2'
          }
        ]
      };
      Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
    });

    await page.click('.catblocks-scene-header');
    await page.waitFor(2);

    const objID = await page.evaluate(() => {
      return Test.ShareUtils.generateID('programID-testscene-tobject');
    });

    const dataSrc = await page.evaluate(() => {
      const objID = Test.ShareUtils.generateID('programID-testscene-tobject');
      return shareTestContainer
        .querySelector('#' + objID + ' #' + objID + '-looks .catblocks-object-look-item')
        .getAttribute('data-src');
    });
    const beforeClickSrc = await page.evaluate(() => {
      const objID = Test.ShareUtils.generateID('programID-testscene-tobject');
      return shareTestContainer
        .querySelector('#' + objID + ' #' + objID + '-looks .catblocks-object-look-item')
        .getAttribute('src');
    });

    const headerSelector = `#${objID}-header`;
    // TODO: does not work because this part is not really visible
    // await page.click(headerSelector);
    await page.evaluate(sel => {
      document.querySelector(sel).click();
    }, headerSelector);

    await page.waitFor(2);

    const afterClickSrc = await page.evaluate(() => {
      const objID = Test.ShareUtils.generateID('programID-testscene-tobject');
      return shareTestContainer
        .querySelector('#' + objID + ' #' + objID + '-looks .catblocks-object-look-item')
        .getAttribute('src');
    });

    expect(beforeClickSrc == null && dataSrc === afterClickSrc).toBeTruthy();
  });

  test('Share render object with magnifying glass in look tab and simulate click to popup image', async () => {
    const testDisplayName = 'My actor';
    const programName = 'magnifyMe';
    const sceneName = 'testscene';
    const objectName = 'testobj';

    // render program
    await page.evaluate(
      ({ testDisplayName, programName, sceneName, objectName }) => {
        const catObj = {
          scenes: [
            {
              name: sceneName,
              objectList: [
                {
                  name: objectName,
                  lookList: [
                    {
                      name: testDisplayName,
                      fileName: 'My actor or object.png'
                    }
                  ]
                }
              ]
            },
            {
              name: 'testscene2'
            }
          ]
        };
        Test.Share.renderProgramJSON(programName, shareTestContainer, catObj);
      },
      { testDisplayName, programName, sceneName, objectName }
    );

    // open scene
    await page.click('.catblocks-scene-header');
    await page.waitFor(500);

    const { objID, expectedID } = await page.evaluate(
      ({ testDisplayName, programName, sceneName, objectName }) => {
        const objID = Test.ShareUtils.generateID(`${programName}-${sceneName}-${objectName}`);
        const expectedID = Test.ShareUtils.generateID(`${objID}-${testDisplayName}`) + '-imgID';
        return { objID, expectedID };
      },
      { testDisplayName, programName, sceneName, objectName }
    );

    const expectedSrc = await page.$eval('#' + objID + ' #' + objID + '-looks .catblocks-object-look-item', node =>
      node.getAttribute('data-src')
    );
    await page.waitForSelector('.catblocks-object-container', { visible: true });

    // open modal
    await page.click('.catblocks-object .card-header');

    const tabID = '#' + objID + '-looks-tab';
    await page.waitForSelector(tabID, { visible: true });
    await page.click(tabID);

    const searchID = '#' + objID + ' #' + objID + '-looks .search';
    await page.waitForSelector(searchID, { visible: true });
    await page.click(searchID);

    const itemContainerID = await page.$eval(
      '#' + objID + ' #' + objID + '-looks .catblocks-object-look-item',
      node => node.id
    );
    const searchContainerInnerHTML = await page.$eval(
      '#' + objID + ' #' + objID + '-looks .search',
      node => node.innerHTML
    );
    const previewSrc = await page.$eval('.imagepreview', node => node.getAttribute('src'));

    const result =
      itemContainerID === expectedID &&
      searchContainerInnerHTML === '<i class="material-icons">search</i>' &&
      previewSrc === expectedSrc;
    expect(result).toBeTruthy();
  });

  test('JSON with one scene', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene1'
            }
          ]
        };

        try {
          Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
        } catch (e) {
          return false;
        }
      })
    ).toBeFalsy();
  });

  test('JSON with two objects in scene rendered properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene',
              objectList: [
                {
                  name: 'Background'
                },
                {
                  name: 'tobject2'
                }
              ]
            },
            {
              name: 'testscene2'
            }
          ]
        };

        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
        const sceneHeader = shareTestContainer.querySelector('.catblocks-scene-header');
        sceneHeader.click();
        return (
          shareTestContainer.querySelector('.catblocks-scene') !== null &&
          shareTestContainer.querySelector('.catblocks-scene-header').innerHTML.length > 0 &&
          shareTestContainer.querySelector('.catblocks-object-container') !== null &&
          shareTestContainer.querySelector('.accordion') !== null &&
          shareTestContainer.querySelector('.catblocks-object .card-header') !== null &&
          shareTestContainer.querySelector('.catblocks-object .card-header').innerHTML ===
            '<div class="header-title">Background</div><i id="code-view-toggler" class="material-icons rotate-left">chevron_left</i>'
        );
      })
    ).toBeTruthy();
  });

  test('JSON empty but XML given', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {};

        try {
          Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
        } catch (e) {
          return false;
        }
      })
    ).toBeFalsy();
  });

  test('Share renders scene and card headers for one scene properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          programName: 'testname',
          scenes: [
            {
              name: 'testscene',
              objectList: [
                {
                  name: 'Background'
                }
              ]
            }
          ]
        };
        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);

        const expectedCardHeaderText = 'testname';

        const cardHeader = shareTestContainer
          .querySelector('.catblocks-scene .card-header')
          .querySelector('.header-title');
        const cardHeaderInitialText = cardHeader.innerHTML;
        cardHeader.click();
        cardHeader.setAttribute('aria-expanded', 'true');
        const cardHeaderTextExpanded = cardHeader.innerHTML;
        cardHeader.click();
        cardHeader.setAttribute('aria-expanded', 'false');
        const cardHeaderTextCollapsed = cardHeader.innerHTML;
        return (
          cardHeaderInitialText === expectedCardHeaderText &&
          cardHeaderTextExpanded === expectedCardHeaderText &&
          cardHeaderTextCollapsed === expectedCardHeaderText
        );
      })
    ).toBeTruthy();
    await page.waitForSelector('.catblocks-object .card-header', {
      visible: true
    });
  });

  test('Share renders scene and card headers for multiple scenes properly', async () => {
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'testscene1',
              objectList: [
                {
                  name: 'Background'
                }
              ]
            },
            {
              name: 'testscene2',
              objectList: [
                {
                  name: 'tobject2'
                }
              ]
            },
            {
              name: 'testscene3',
              objectList: [
                {
                  name: 'tobject3'
                }
              ]
            }
          ]
        };
        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);

        const expectedSceneHeaderText =
          '<div class="header-title">testscene1</div><i id="code-view-toggler" class="material-icons rotate-left">chevron_left</i>';
        const expectedCardHeaderText =
          '<div class="header-title">Background</div><i id="code-view-toggler" class="material-icons rotate-left">chevron_left</i>';
        const sceneHeader = shareTestContainer.querySelector('.catblocks-scene-header');
        sceneHeader.click();
        const cardHeader = shareTestContainer.querySelector('.catblocks-object .card-header');
        const sceneHeaderInitialText = sceneHeader.innerHTML;
        const cardHeaderInitialText = cardHeader.innerHTML;
        cardHeader.click();
        sceneHeader.setAttribute('aria-expanded', 'true');
        cardHeader.setAttribute('aria-expanded', 'true');
        const sceneHeaderTextExpanded = sceneHeader.innerHTML;
        const cardHeaderTextExpanded = cardHeader.innerHTML;
        cardHeader.click();
        sceneHeader.click();
        sceneHeader.setAttribute('aria-expanded', 'false');
        cardHeader.setAttribute('aria-expanded', 'false');
        const sceneHeaderTextCollapsed = sceneHeader.innerHTML;
        const cardHeaderTextCollapsed = cardHeader.innerHTML;
        return (
          sceneHeaderInitialText === expectedSceneHeaderText &&
          cardHeaderInitialText === expectedCardHeaderText &&
          sceneHeaderTextExpanded === expectedSceneHeaderText &&
          cardHeaderTextExpanded === expectedCardHeaderText &&
          sceneHeaderTextCollapsed === expectedSceneHeaderText &&
          cardHeaderTextCollapsed === expectedCardHeaderText
        );
      })
    ).toBeTruthy();
    await page.waitForSelector('.catblocks-object .card-header', {
      visible: true
    });
  });

  test('scrolling bricks on x axis on mobile share page is working', async () => {
    await page.setViewport({
      width: 200,
      height: 1000
    });
    expect(
      await page.evaluate(() => {
        const catObj = {
          scenes: [
            {
              name: 'Testscene',
              objectList: [
                {
                  name: 'TestObject',
                  lookList: [],
                  soundList: [],
                  scriptList: [
                    {
                      name: 'StartScript',
                      brickList: [
                        {
                          name: 'PlaySoundBrick',
                          loopOrIfBrickList: [],
                          elseBrickList: [],
                          formValues: {},
                          colorVariation: 0
                        }
                      ],
                      formValues: {}
                    }
                  ]
                }
              ]
            },
            {
              name: 'testscene2'
            }
          ]
        };
        Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
        const sceneHeader = shareTestContainer.querySelector('.catblocks-scene-header');
        sceneHeader.click();
        const cardHeader = shareTestContainer.querySelector('.catblocks-object .card-header');
        const brickContainer = shareTestContainer.querySelector('.catblocks-script');
        cardHeader.click();
        const initialXPosition = brickContainer.scrollLeft;
        brickContainer.scrollBy(1, 0);
        const scrolledXPosition = brickContainer.scrollLeft;
        return initialXPosition !== scrolledXPosition && brickContainer.style.overflowX === 'auto';
      })
    ).toBeTruthy();
  });

  test('Images not rendered when disabled', async () => {
    const numTabs = await page.evaluate(() => {
      Test.Share.config.renderLooks = false;

      const catObj = {
        scenes: [
          {
            name: 'Testscene',
            objectList: [
              {
                name: 'TestObject',
                lookList: [],
                soundList: [],
                scriptList: [
                  {
                    name: 'StartScript',
                    brickList: [
                      {
                        name: 'PlaySoundBrick',
                        loopOrIfBrickList: [],
                        elseBrickList: [],
                        formValues: {},
                        colorVariation: 0
                      }
                    ],
                    formValues: {}
                  }
                ]
              }
            ]
          },
          {
            name: 'testscene2'
          }
        ]
      };
      Test.Share.renderProgramJSON('programID', shareTestContainer, catObj);
      const tabs = $('.catro-tabs .nav-item');
      Test.Share.config.renderLooks = true;
      return tabs.length;
    });
    expect(numTabs).toBe(2);
  });
});
