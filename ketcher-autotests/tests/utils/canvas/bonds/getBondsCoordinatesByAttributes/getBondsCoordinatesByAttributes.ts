import { Page } from '@playwright/test';
import { Bond } from 'ketcher-core';
import { BondAttributes, SORT_TYPE } from '@utils/canvas/types';
import { getLeftTopBarSize } from '@utils/canvas/common/getLeftTopBarSize';
import { findIntersectionFields } from '@utils/canvas/common/findIntersectionFields';
import { sortItems } from '@utils/canvas/common/sortItems';
import { BondXy } from '@utils/canvas/types';
import {
  NO_STRUCTURE_AT_THE_CANVAS_ERROR,
  STRUCTURE_NOT_FOUND_ERROR,
} from '@utils/canvas/constants';

/**
 * Common helper to calculate
 * left / right / top / bottom / byindex / first bonds functions
 * Throws error NO_STRUCTURE_AT_THE_CANVAS_ERROR
 * if the are no structures on the canvas
 * Throws STRUCTURE_NOT_FOUND_ERROR if can not find any bond
 * @param page - playwright page object
 * @param attrs - Bond attributes like type, angle, begin etc.
 * @param sortBy - sort type
 * @returns sorted bonds
 */
export async function getBondsCoordinatesByAttributes(
  page: Page,
  attrs: BondAttributes,
  sortBy: SORT_TYPE = SORT_TYPE.ASC_X
): Promise<BondXy[] | []> {
  const { bonds, scale } = await page.evaluate(() => {
    return {
      bonds: [...window.ketcher?.editor?.struct()?.bonds?.values()],
      scale: window.ketcher?.editor?.options()?.scale,
    };
  });

  if (bonds.length === 0) {
    throw new Error(NO_STRUCTURE_AT_THE_CANVAS_ERROR);
  }

  const targets: Bond[] = findIntersectionFields(attrs, bonds) as Bond[];

  if (targets.length) {
    const { leftBarWidth, topBarHeight } = await getLeftTopBarSize(page);
    const coords = targets.map((target) => {
      return {
        ...target,
        x: target.center.x * scale + leftBarWidth,
        y: target.center.y * scale + topBarHeight,
      };
    });

    return sortItems(sortBy, coords);
  }

  throw new Error(STRUCTURE_NOT_FOUND_ERROR);
}