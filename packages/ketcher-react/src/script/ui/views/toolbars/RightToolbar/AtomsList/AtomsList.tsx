/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import { ElementColor, Elements, shortcutStr } from 'ketcher-core';
import { atomCuts } from '../../../../action/atoms';

import Atom from '../../../../component/view/Atom';
import { Tools, UiActionAction } from '../../../../action';
import { forwardRef } from 'react';
import style from '../../../../../../components/styles/consts';
import styled from '@emotion/styled';

interface AtomsListProps {
  atoms: string[];
  status: Tools;
  active?: {
    tool?: string;
    opts: {
      label: string;
    };
  };
}

interface AtomsListCallProps {
  onAction: (action: UiActionAction) => void;
}

type Props = AtomsListProps & AtomsListCallProps;

const StyledAtom = styled(Atom)((props: any) => {
  const atomColor = props?.el?.label ? ElementColor[props.el.label] : '#000';
  return `
       color: ${atomColor};
       border: 1px solid transparent;
       background-color: transparent;
       cursor: pointer;
       &:hover {
         background-color: ${style.color.primaryWhite};
       }
       &:active {
        border-color: ${atomColor};
        background-color: ${style.color.primaryWhite};
       }
       &.selected {
        background-color: ${style.color.primaryWhite};
        border-color: ${style.color.green};
         &:hover {
          background-color: ${style.color.primaryWhite};
         }
       }
       &:disabled, &:disabled:active, &:disabled:hover {
        cursor: not-allowed;
        color: #333;
        opacity: 0.4;
        border: none;
        border-color: none;
        background-color: transparent;
       }
   `;
});

const AtomsList = forwardRef<HTMLDivElement, Props>((props: Props, ref) => {
  const { atoms, active, status, onAction } = props;
  const isAtom = active && active.tool === 'atom';

  return (
    <div ref={ref}>
      {atoms.map((label) => {
        const element = Elements.get(label);
        const shortcut =
          atoms.indexOf(label) > -1 ? shortcutStr(atomCuts[label]) : null;
        const isSelected = isAtom && active && active.opts.label === label;
        const id = `atom-${label.toLowerCase()}`;
        return (
          <StyledAtom
            key={label}
            el={element}
            shortcut={shortcut}
            className={isSelected ? 'selected' : ''}
            selected={isSelected}
            disabled={status[id]?.disabled}
            onClick={() => onAction({ tool: 'atom', opts: { label } })}
          />
        );
      })}
    </div>
  );
});

export type { AtomsListProps, AtomsListCallProps };
export { AtomsList };
