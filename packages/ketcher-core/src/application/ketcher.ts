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

import {
  FormatterFactory,
  SupportedFormat,
  identifyStructFormat
} from './formatters'
import { GenerateImageOptions, StructService } from 'domain/services'

import { Editor } from './editor'
import { Indigo } from 'application/indigo'
import { MolfileFormat } from 'domain/serializers'
import { Struct } from 'domain/entities'
import assert from 'assert'
import { EventEmitter } from 'events'
import { runAsyncAction } from 'utilities'

async function prepareStructToRender(
  structStr: string,
  structService: StructService,
  ketcherInstance: Ketcher
): Promise<Struct> {
  const struct: Struct = await parseStruct(
    structStr,
    structService,
    ketcherInstance
  )
  struct.initHalfBonds()
  struct.initNeighbors()
  struct.setImplicitHydrogen()
  struct.markFragments()

  return struct
}

function parseStruct(
  structStr: string,
  structService: StructService,
  ketcherInstance: Ketcher
) {
  const format = identifyStructFormat(structStr)
  const factory = new FormatterFactory(structService)
  const options = JSON.parse(ketcherInstance.settings)

  // const service = factory.create(format, { 'dearomatize-on-load': true })
  const service = factory.create(format, options)
  return service.getStructureFromStringAsync(structStr)
}

function getStructure(
  structureFormat: SupportedFormat = 'rxn',
  formatterFactory: FormatterFactory,
  struct: Struct
): Promise<string> {
  const formatter = formatterFactory.create(structureFormat)
  return formatter.getStructureFromStructAsync(struct)
}

export class Ketcher {
  #structService: StructService
  #formatterFactory: FormatterFactory
  #editor: Editor
  #indigo: Indigo
  #eventBus: EventEmitter

  get editor(): Editor {
    return this.#editor
  }

  get eventBus(): EventEmitter {
    return this.#eventBus
  }

  constructor(
    editor: Editor,
    structService: StructService,
    formatterFactory: FormatterFactory
  ) {
    assert(editor != null)
    assert(structService != null)
    assert(formatterFactory != null)

    this.#editor = editor
    this.#structService = structService
    this.#formatterFactory = formatterFactory
    this.#indigo = new Indigo(this.#structService)
    this.#eventBus = new EventEmitter()
  }

  get indigo() {
    return this.#indigo
  }

  // TEMP.: getting only dearomatize-on-load setting
  get settings() {
    const options = this.#editor.options()
    if ('dearomatize-on-load' in options) {
      return JSON.stringify({
        'dearomatize-on-load': options['dearomatize-on-load']
      })
    }
    throw new Error('dearomatize-on-load option is not provided!')
  }

  setSettings(settings: string) {
    return this.#editor.setOptions(settings)
  }

  getSmiles(isExtended = false): Promise<string> {
    const format: SupportedFormat = isExtended ? 'smilesExt' : 'smiles'
    return getStructure(format, this.#formatterFactory, this.editor.struct())
  }

  async getMolfile(molfileFormat: MolfileFormat = 'v2000'): Promise<string> {
    if (this.containsReaction()) {
      throw Error(
        'The structure cannot be saved as *.MOL due to reaction arrrows.'
      )
    }

    const format: SupportedFormat =
      molfileFormat === 'v3000' ? 'molV3000' : 'mol'
    const molfile = await getStructure(
      format,
      this.#formatterFactory,
      this.#editor.struct()
    )

    return molfile
  }

  async getRxn(molfileFormat: MolfileFormat = 'v2000'): Promise<string> {
    if (!this.containsReaction()) {
      throw Error(
        'The structure cannot be saved as *.RXN: there is no reaction arrows.'
      )
    }
    const format: SupportedFormat =
      molfileFormat === 'v3000' ? 'rxnV3000' : 'rxn'
    const rxnfile = await getStructure(
      format,
      this.#formatterFactory,
      this.#editor.struct()
    )

    return rxnfile
  }

  getKet(): Promise<string> {
    return getStructure('ket', this.#formatterFactory, this.#editor.struct())
  }

  getSmarts(): Promise<string> {
    return getStructure('smarts', this.#formatterFactory, this.#editor.struct())
  }

  getCml(): Promise<string> {
    return getStructure('cml', this.#formatterFactory, this.#editor.struct())
  }

  getInchi(withAuxInfo = false): Promise<string> {
    return getStructure(
      withAuxInfo ? 'inChIAuxInfo' : 'inChI',
      this.#formatterFactory,
      this.#editor.struct()
    )
  }

  async generateInchIKey(): Promise<string> {
    const struct: string = await getStructure(
      'ket',
      this.#formatterFactory,
      this.#editor.struct()
    )

    return this.#structService.generateInchIKey(struct)
  }

  containsReaction(): boolean {
    return this.editor.struct().hasRxnArrow()
  }

  async setMolecule(structStr: string): Promise<void> {
    runAsyncAction<void>(async () => {
      assert(typeof structStr === 'string')

      const struct: Struct = await prepareStructToRender(
        structStr,
        this.#structService,
        this
      )

      this.#editor.struct(struct)
    }, this.eventBus)
  }

  async addFragment(structStr: string): Promise<void> {
    runAsyncAction<void>(async () => {
      assert(typeof structStr === 'string')

      const struct: Struct = await prepareStructToRender(
        structStr,
        this.#structService,
        this
      )

      this.#editor.structToAddFragment(struct)
    }, this.eventBus)
  }

  recognize(image: Blob, version?: string): Promise<Struct> {
    return this.#indigo.recognize(image, { version: version })
  }

  async generateImage(
    data: string,
    options: GenerateImageOptions = { outputFormat: 'png' }
  ): Promise<Blob> {
    let meta = ''

    switch (options.outputFormat) {
      case 'svg':
        meta = 'image/svg+xml'
        break

      case 'png':
      default:
        meta = 'image/png'
        options.outputFormat = 'png'
    }

    const base64 = await this.#structService.generateImageAsBase64(
      data,
      options
    )
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: meta })
    return blob
  }
}
