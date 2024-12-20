import { z } from 'zod';

// See here for all the supported versions https://cloud.google.com/docs/buildpacks/builders#buildergoogle-22_supported_languages
export const mondaycodercSchema = z
  .object({
    RUNTIME: z
      .enum(['Python', 'Java', 'Go', 'PHP', 'Ruby', 'Node.js', 'NETCore'], {
        errorMap: () => ({
          message:
            'Invalid Runtime in .mondaycoderc. Supported runtimes are Python, Java, Go, PHP, Ruby, Node.js, NETCore',
        }),
      })
      .optional(),
    RUNTIME_VERSION: z.string().optional(),
  })
  .strict()
  .refine(data => {
    if (data.RUNTIME_VERSION) {
      if (data.RUNTIME === 'Python') {
        if (!/^3\.(10|11|12)\.\d+$/.test(data.RUNTIME_VERSION || '')) {
          throw new Error(
            'Invalid RUNTIME_VERSION for Python in .mondaycoderc. Allowed versions are 3.10.x, 3.11.x, 3.12.x',
          );
        }

        return true;
      }

      if (data.RUNTIME === 'Java') {
        // 8, 11, 17, 21 are the only LTS versions, see https://www.oracle.com/eg/java/technologies/java-se-support-roadmap.html
        if (!['8', '11', '17', '21'].includes(data.RUNTIME_VERSION || '')) {
          throw new Error('Invalid RUNTIME_VERSION for Java in .mondaycoderc. Allowed versions are 8, 11, 17, 21');
        }

        return true;
      }

      if (data.RUNTIME === 'Go') {
        if (!/^1\.\d+\.\d+$/.test(data.RUNTIME_VERSION || '')) {
          throw new Error('Invalid RUNTIME_VERSION for Go in .mondaycoderc. Allowed versions are 1.x.x');
        }

        return true;
      }

      if (data.RUNTIME === 'PHP') {
        if (!/^8\.([1-3])\.\d+$/.test(data.RUNTIME_VERSION || '')) {
          throw new Error('Invalid RUNTIME_VERSION for PHP in .mondaycoderc. Allowed versions are 8.1.x, 8.2.x, 8.3.x');
        }

        return true;
      }

      if (data.RUNTIME === 'Ruby') {
        if (!/^3\.([1-3])\.\d+$/.test(data.RUNTIME_VERSION || '')) {
          throw new Error(
            'Invalid RUNTIME_VERSION for Ruby in .mondaycoderc. Allowed versions are 3.1.x, 3.2.x and 3.3.x',
          );
        }

        return true;
      }

      if (data.RUNTIME === 'Node.js') {
        // See here https://nodejs.org/en/about/previous-releases
        if (!/^(18|20|22)\.\d+\.\d+$/.test(data.RUNTIME_VERSION || '')) {
          throw new Error(
            'Invalid RUNTIME_VERSION for Node.js  in .mondaycoderc. Allowed versions are 18.x.x, 20.x.x, 22.x.x',
          );
        }

        return true;
      }

      if (data.RUNTIME === 'NETCore') {
        // See here https://dotnet.microsoft.com/en-us/download/dotnet
        if (!/^(6|8)\.\d+$/.test(data.RUNTIME_VERSION || '')) {
          throw new Error('Invalid RUNTIME_VERSION for NETCore in .mondaycoderc. Allowed versions are 6.x, 8.x');
        }

        return true;
      }
    }

    return true;
  });
