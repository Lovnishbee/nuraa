import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { handleProactiveEngineHttpRequest } from '../_shared/proactive/edge-http.ts'
import { handleProactiveEngineRequest } from '../_shared/proactive/runtime.ts'

Deno.serve(async (request: Request) => {
  return handleProactiveEngineHttpRequest({
    request,
    env: Deno.env.toObject(),
    createClient,
    runtimeHandler: handleProactiveEngineRequest,
  })
})
