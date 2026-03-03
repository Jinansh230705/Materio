/*
 * Function: execute_sql
 * This RPC function allows executing SQL directly from Netlify functions.
 * Use this carefully as it bypasses typical security measures.
 */

create or replace function execute_sql(sql_command text) returns json as $$
declare
  result json;
begin
  execute sql_command into result;
  return result;
exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$ language plpgsql security definer;