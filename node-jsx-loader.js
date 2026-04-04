import babel from '@babel/core';

export async function load (url, context, defaultLoad){
    const result = await defaultLoad(url, context, defaultLoad);
    if(result.format === 'module'){
        const transformed = await babel.transformAsync(result.source, {
            plugins: [[
                "@babel/plugin-transform-react-jsx",
                { runtime: "automatic"}
            ]]
        });

        return {
            source: transformed.code,
            format: 'module'
        }
    }

    return result;
}