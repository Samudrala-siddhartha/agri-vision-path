
update storage.buckets set public = true where id = 'disease-references';

drop policy if exists dr_authenticated_read on storage.objects;
drop policy if exists dr_public_read_files on storage.objects;
-- Anonymous SELECT only when path matches a known prefix (prevents bucket-root listing)
create policy dr_public_read_files on storage.objects
for select to anon, authenticated
using (bucket_id = 'disease-references' and position('/' in name) > 0);
