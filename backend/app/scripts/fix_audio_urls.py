from ..services.supabase_service import SupabaseService, supabase_client

interview_id = "74d52bba-a57d-42e7-b230-8e3ca371227b"  # replace as needed
rows = supabase_client.table("conversation_turns").select("id,audio_url").eq("interview_id", interview_id).execute().data
for r in rows:
    url = (r.get("audio_url") or "").strip()
    if not url:
        continue
    clean = SupabaseService.normalize_public_url(url)
    # If looks public, generate signed
    signed = SupabaseService.to_signed_url_from_public_url(clean, expires_in=60*60*24)
    new_url = signed or clean
    if new_url != url:
        supabase_client.table("conversation_turns").update({"audio_url": new_url}).eq("id", r["id"]).execute()
        print("Updated", r["id"])
print("Done")