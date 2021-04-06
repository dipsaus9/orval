import { join } from 'path';
import { Options, OutputMode, OutputOptions } from '../../types';
import { WriteSpecsProps } from '../../types/writers';
import { getExtension } from '../../utils/extension';
import { getFileInfo } from '../../utils/file';
import { isObject, isString } from '../../utils/is';
import { createSuccessMessage } from '../../utils/messages/logs';
import { isUrl } from '../../utils/url';
import { writeSchemas } from './schemas';
import { writeSingleMode } from './singleMode';
import { writeSplitMode } from './splitMode';
import { writeSplitTagsMode } from './splitTagsMode';
import { writeTagsMode } from './tagsMode';

const isSingleMode = (output: string | OutputOptions): output is string =>
  isString(output) || !output.mode || output.mode === OutputMode.SINGLE;

export const writeSpecs = (
  workspace: string,
  options: Options,
  backend?: string,
) => ({ operations, schemas, rootSpecKey, info }: WriteSpecsProps) => {
  const { output } = options;

  if (!output || (isObject(output) && !output.target && !output.schemas)) {
    throw new Error('You need to provide an output');
  }

  if (isObject(output) && output.schemas) {
    const rootSchemaPath = join(workspace, output.schemas);

    const specsName = Object.keys(schemas).reduce((acc, specKey) => {
      const basePath = (isUrl(specKey)
        ? specKey.replace(rootSpecKey, '')
        : specKey.replace(getFileInfo(rootSpecKey).dirname, '')
      ).replace(`.${getExtension(specKey)}`, '');

      const name = basePath.slice(1).split('/').join('-');

      return { ...acc, [specKey]: name };
    }, {} as Record<keyof typeof schemas, string>);

    Object.entries(schemas).forEach(([specKey, schemas]) => {
      const isRootKey = rootSpecKey === specKey;
      const schemaPath = !isRootKey
        ? join(rootSchemaPath, specsName[specKey])
        : rootSchemaPath;

      writeSchemas({
        workspace,
        schemaPath,
        schemas,
        info,
        rootSpecKey,
        specsName,
        isRootKey
      });
    });
  }

  if (isObject(output) && !output.target) {
    createSuccessMessage(backend);
    return;
  }

  if (isSingleMode(output)) {
    writeSingleMode({
      workspace,
      operations,
      output: isString(output) ? { target: output } : output,
      info,
      schemas,
    });
  } else if (output.mode === OutputMode.SPLIT) {
    writeSplitMode({ workspace, operations, output, info, schemas });
  } else if (output.mode === OutputMode.TAGS) {
    writeTagsMode({ workspace, operations, output, info, schemas });
  } else if (output.mode === OutputMode.TAGS_SPLIT) {
    writeSplitTagsMode({ workspace, operations, output, info, schemas });
  }

  createSuccessMessage(backend);
};
