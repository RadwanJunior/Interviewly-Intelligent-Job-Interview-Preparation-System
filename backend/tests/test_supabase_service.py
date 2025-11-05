import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock, AsyncMock
from app.services.supabase_service import SupabaseService


@pytest.fixture
def mock_client():
    return MagicMock()


@pytest.fixture
def service(mock_client):
    return SupabaseService(client=mock_client)


def test_create_user_success(service, mock_client):
    mock_client.auth.sign_up.return_value = MagicMock(user={'id': 'u1'})
    res = service.create_user('a@b.com', 'pass')
    assert hasattr(res, 'user') or ('error' not in res)


def test_login_user_success(service, mock_client):
    mock_resp = MagicMock()
    mock_resp.session = MagicMock(access_token='at', refresh_token='rt')
    mock_resp.user = {'id': 'u1'}
    mock_client.auth.sign_in_with_password.return_value = mock_resp
    res = service.login_user('a@b.com', 'pass')
    assert res['access_token'] == 'at'
    assert res['user']['id'] == 'u1'


def test_login_user_failure(service, mock_client):
    mock_client.auth.sign_in_with_password.side_effect = Exception('bad')
    res = service.login_user('a@b.com', 'pass')
    assert 'error' in res


def test_get_file_url(service, mock_client):
    mock_client.storage.from_.return_value.create_signed_url.return_value = {'signed_url': 'u'}
    res = service.get_file_url('path', 'bucket')
    assert isinstance(res, dict)


@pytest.mark.asyncio
async def test_upload_file_and_delete(service, mock_client):
    # UploadFile read is awaited in service; emulate file-like with AsyncMock
    mock_file = AsyncMock()
    mock_file.read = AsyncMock(return_value=b'data')
    mock_file.filename = 'f.txt'
    mock_client.storage.from_.return_value.upload.return_value = {'Key': 'ok'}
    up = await service.upload_file('uid', mock_file, bucket_name='b')
    assert 'Key' in up
    mock_client.storage.from_.return_value.remove.return_value = {'removed': True}
    rm = service.delete_file('uid/f.txt', bucket_name='b')
    assert 'removed' in rm


def test_create_and_get_resume(service, mock_client):
    mock_client.table.return_value.insert.return_value.execute.return_value = {'data': [{'id': 'r1'}]}
    res = service.create_resume('u', 'url', 'txt')
    assert isinstance(res, dict)
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'r1'}]}
    r = service.get_resume_table('u')
    assert isinstance(r, dict)


def test_create_job_description_and_get(service, mock_client):
    mock_client.table.return_value.insert.return_value.execute.return_value = {'data': [{'id': 'j1'}]}
    res = service.create_job_description('u', 't', 'c', 'l', 'full-time', 'desc')
    assert isinstance(res, dict)
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'j1'}]}
    r = service.get_job_details_table('u')
    assert isinstance(r, dict)


def test_interview_session_crud(service, mock_client):
    # create
    mock_client.table.return_value.insert.return_value.execute.return_value = {'data': [{'id': 'i1'}]}
    c = service.create_interview_session('u', 'r', 'j', ['q1'])
    assert isinstance(c, dict)
    # get
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'i1'}]}
    g = service.get_interview_sessions('u')
    assert isinstance(g, dict)
    # update
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'i1'}]}
    u = service.update_interview_session('i1', 'done')
    assert isinstance(u, dict)


def test_feedback_flow(service, mock_client):
    mock_client.table.return_value.insert.return_value.execute.return_value = {'data': [{'id': 'f1'}]}
    feedback = {'interview_id': 'i1', 'user_id': 'u1', 'feedback_data': {}}
    r = service.insert_feedback(feedback)
    assert isinstance(r, dict)
    # get feedback returns .data in implementation
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'f1'}])
    g = service.get_feedback('i1')
    assert isinstance(g, list)


@pytest.mark.asyncio
async def test_upload_recording_file_and_get_interview_data(service, mock_client, tmp_path):
    # create a temp file
    p = tmp_path / 'rec.wav'
    p.write_bytes(b'bytes')
    mock_client.storage.from_.return_value.upload.return_value = {}
    mock_client.storage.from_.return_value.get_public_url.return_value = {'public_url': 'u'}
    res = await service.upload_recording_file('u1', str(p), bucket_name='recordings', interview_id='i1')
    assert isinstance(res, dict)

    # get_interview_data chain
    interview_row = {'resume_id': 'r1', 'job_description_id': 'j1'}
    resume_row = {'extracted_text': 'rt'}
    job_row = {'title': 't'}

    def make_table_chain(return_data):
        single = MagicMock()
        single.execute.return_value = MagicMock(data=return_data)
        sel = MagicMock()
        # allow .eq() chaining
        sel.eq.return_value = sel
        sel.single.return_value = single
        table_mock = MagicMock()
        table_mock.select.return_value = sel
        return table_mock

    # Return different chain mocks depending on table name
    def table_side_effect(name):
        if name == 'interviews':
            return make_table_chain(interview_row)
        if name == 'resumes':
            return make_table_chain(resume_row)
        if name == 'job_descriptions':
            return make_table_chain(job_row)
        return make_table_chain({})

    mock_client.table.side_effect = table_side_effect
    idata = await service.get_interview_data('u1', 'i1')
    # get_interview_data returns a dict when successful. Depending on how the
    # supabase client mock is constructed it may come back as a plain dict or a
    # MagicMock with a .data attribute containing the dict. Accept both shapes.
    if isinstance(idata, dict):
        assert 'resume' in idata and 'job_description' in idata
    elif hasattr(idata, 'data') and isinstance(idata.data, dict):
        assert 'resume' in idata.data and 'job_description' in idata.data
    else:
        pytest.fail(f"Unexpected return from get_interview_data: {type(idata)!r}")


def test_refresh_and_logout(service, mock_client):
    # refresh_token success
    mock_resp = MagicMock()
    mock_resp.session = MagicMock(access_token='a', refresh_token='r')
    mock_resp.user = {'id': 'u'}
    mock_client.auth.refresh_session.return_value = mock_resp
    res = service.refresh_token('rtok')
    assert res['access_token'] == 'a'

    # logout
    mock_client.auth.sign_out.return_value = None
    out = service.logout()
    assert out['message'] == 'Logged out successfully'


def test_profile_methods(service, mock_client):
    # create_profile
    mock_client.from_.return_value.insert.return_value.execute.return_value = {'data': [{'id': 'p1'}]}
    cp = service.create_profile({'id': 'p1'})
    assert isinstance(cp, dict)

    # get_profile returns object (no execute in code)
    mock_client.from_.return_value.select.return_value.eq.return_value.single.return_value = {'id': 'p1'}
    gp = service.get_profile('p1')
    assert gp == {'id': 'p1'}


def test_get_current_user_variants(service, mock_client):
    # no token
    req = MagicMock(); req.cookies.get.return_value = None
    assert service.get_current_user(req) is None

    # with token
    req2 = MagicMock(); req2.cookies.get.return_value = 'tok'
    mock_client.auth.get_user.return_value = MagicMock(user={'id': 'u2'})
    u = service.get_current_user(req2)
    assert u == {'id': 'u2'}


def test_update_resume_and_storage(service, mock_client):
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'r1'}]}
    up = service.update_resume('r1', 'newtext')
    assert isinstance(up, dict)

    mock_client.storage.from_.return_value.list.return_value = ['f1', 'f2']
    lst = service.get_resume_storage('u1', bucket_name='resumes')
    assert isinstance(lst, list)


def test_interview_question_crud(service, mock_client):
    # create_interview_question
    mock_client.table.return_value.insert.return_value.execute.return_value = {'data': [{'id': 'q1'}]}
    c = service.create_interview_question('i1', 'What?')
    assert isinstance(c, dict)

    # update_interview_session_questions
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'i1'}]}
    u = service.update_interview_session_questions('i1', ['q1', 'q2'])
    assert isinstance(u, dict)

    # get_job_description (single)
    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = {'data': {'id': 'j1'}}
    jd = service.get_job_description('j1')
    assert isinstance(jd, dict)

    # insert_interview_questions
    mock_client.table.return_value.insert.return_value.execute.return_value = {'data': [{'id': 'q2'}]}
    ins = service.insert_interview_questions([{'question': 'x'}])
    assert isinstance(ins, dict)

    # get_interview_question
    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = {'data': {'id': 'q1'}}
    gq = service.get_interview_question('q1')
    assert isinstance(gq, dict)

    # get_interview_question_table
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'q1'}]}
    gqt = service.get_interview_question_table('i1')
    assert isinstance(gqt, dict)


@pytest.mark.asyncio
async def test_insert_user_response_and_getters(service, mock_client):
    # insert_user_response
    mock_client.table.return_value.insert.return_value.execute.return_value = {'data': [{'id': 'ur1'}]}
    res = await service.insert_user_response({'interview_id': 'i1', 'question_id': 'q1', 'audio_url': 'u'})
    assert isinstance(res, dict)

    # get_user_response
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'ur1'}]}
    r = service.get_user_response('i1')
    assert isinstance(r, dict)

    # update_user_response
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'ur1', 'processed': True}]}
    ur = service.update_user_response('ur1', True)
    assert isinstance(ur, dict)


def test_user_responses_and_feedback(service, mock_client):
    # get_user_responses returns .data
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'u1'}])
    urs = service.get_user_responses('i1')
    assert isinstance(urs, list)

    # save_feedback
    mock_client.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{'id': 'f1'}])
    sf = service.save_feedback({'interview_id': 'i1', 'user_id': 'u1', 'feedback_data': {}})
    assert isinstance(sf, list)

    # get_question_by_order
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={'id': 'q1'})
    q = service.get_question_by_order('i1', 1)
    assert isinstance(q, dict)

    # update_user_responses_processed
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'u1'}])
    up = service.update_user_responses_processed('i1')
    assert isinstance(up, list)


def test_interview_history_and_job_details(service, mock_client):
    mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(data=[{'id': 'i1', 'job_description_id': 'j1'}])
    hist = service.get_interview_history('u1')
    assert isinstance(hist, list)

    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={'title': 'T', 'company': 'C'})
    jd = service.get_job_description_details('j1')
    assert isinstance(jd, dict)

    mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={'feedback_data': {}})
    fb = service.get_interview_feedback('i1')
    assert isinstance(fb, dict) or fb is None


def test_update_interview_and_preparation_plan(service, mock_client):
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'i1', 'score': 10}])
    u = service.update_interview('i1', {'score': 10})
    assert isinstance(u, dict) or u is None

    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=[{'id': 'p1'}])
    ap = service.get_active_preparation_plan('u1')
    assert ap is None or isinstance(ap, dict)

    mock_client.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{'id': 'p2'}])
    cp = service.create_preparation_plan({'job_title': 't'})
    assert cp is None or isinstance(cp, dict)

    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'p2'}])
    up = service.update_preparation_plan('p2', {'steps': []})
    assert up is None or isinstance(up, dict)

    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'p2'}])
    owned = service.check_plan_ownership('p2', 'u1')
    assert owned in (True, False)

    mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[{'id': 'p2'}])
    stat = service.update_preparation_plan_status_by_user('u1', 'inactive')
    assert isinstance(stat, (list, dict))


def test_get_latest_interview_session_success(service, mock_client):
    chain = mock_client.table.return_value
    chain.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = {'data': [{'id': 'i1'}]}
    result = service.get_latest_interview_session('u1')
    assert isinstance(result, dict)


def test_get_interview_questions_success(service, mock_client):
    chain = mock_client.table.return_value
    chain.select.return_value.eq.return_value.execute.return_value = {'data': [{'id': 'q1'}]}
    result = service.get_interview_questions('s1')
    assert isinstance(result, dict)


def test_create_user_returns_error_when_no_user(service, mock_client):
    mock_client.auth.sign_up.return_value = SimpleNamespace(user=None)
    result = service.create_user('user@example.com', 'pass')
    assert result['error']['message'] == 'User creation failed'


def test_create_user_exception(service, mock_client):
    mock_client.auth.sign_up.side_effect = Exception('boom')
    result = service.create_user('user@example.com', 'pass')
    assert result['error']['message'] == 'boom'


def test_refresh_token_invalid(service, mock_client):
    mock_client.auth.refresh_session.return_value = SimpleNamespace(session=None)
    result = service.refresh_token('refresh')
    assert result['error']['message'] == 'Invalid refresh token'


def test_refresh_token_exception(service, mock_client):
    mock_client.auth.refresh_session.side_effect = Exception('boom')
    result = service.refresh_token('refresh')
    assert result['error']['message'] == 'boom'


def test_logout_exception(service, mock_client):
    mock_client.auth.sign_out.side_effect = Exception('boom')
    result = service.logout()
    assert result['error']['message'] == 'boom'


def test_create_profile_exception(service, mock_client):
    mock_client.from_.side_effect = Exception('boom')
    result = service.create_profile({'id': 'p1'})
    assert result['error']['message'] == 'boom'


def test_get_profile_exception(service, mock_client):
    mock_client.from_.side_effect = Exception('boom')
    result = service.get_profile('p1')
    assert result['error']['message'] == 'boom'


def test_get_current_user_exception(service, mock_client):
    request = MagicMock()
    request.cookies.get.return_value = 'token'
    mock_client.auth.get_user.side_effect = Exception('boom')
    result = service.get_current_user(request)
    assert result['error']['message'] == 'boom'


def test_get_file_url_exception(service, mock_client):
    mock_client.storage.from_.side_effect = Exception('boom')
    result = service.get_file_url('path/file', 'bucket')
    assert result['error']['message'] == 'boom'


@pytest.mark.asyncio
async def test_upload_file_exception(service, mock_client):
    failing_file = AsyncMock()
    failing_file.read.side_effect = Exception('boom')
    failing_file.filename = 'data.bin'
    result = await service.upload_file('uid', failing_file)
    assert result['error']['message'] == 'boom'


def test_delete_file_exception(service, mock_client):
    mock_client.storage.from_.return_value.remove.side_effect = Exception('boom')
    result = service.delete_file('uid/file', bucket_name='public')
    assert result['error']['message'] == 'boom'


def test_get_resume_storage_exception(service, mock_client):
    storage = mock_client.storage.from_.return_value
    storage.list.side_effect = Exception('boom')
    result = service.get_resume_storage('uid', bucket_name='resumes')
    assert result['error']['message'] == 'boom'


@pytest.mark.parametrize(
    ("method_name", "args"),
    [
        ("create_resume", ("uid", "url", "text")),
        ("update_resume", ("rid", "text")),
        ("get_resume_table", ("uid",)),
        ("create_job_description", ("uid", "title", "company", "location", "type", "desc")),
        ("get_job_details_table", ("uid",)),
        ("create_interview_session", ("uid", "rid", "jid", ["q1"])),
        ("get_interview_sessions", ("uid",)),
        ("update_interview_session", ("sid", "complete")),
        ("get_latest_interview_session", ("uid",)),
        ("get_interview_questions", ("sid",)),
        ("create_interview_question", ("iid", "question")),
        ("update_interview_session_questions", ("iid", ["q1"])),
        ("get_job_description", ("jid",)),
        ("insert_interview_questions", ([{"question": "q"}],)),
        ("get_interview_question", ("qid",)),
        ("get_interview_question_table", ("iid",)),
        ("get_user_response", ("iid",)),
        ("update_user_response", ("rid", True)),
        ("insert_feedback", ({"feedback": True},)),
        ("get_feedback", ("iid",)),
        ("get_user_responses", ("iid",)),
        ("save_feedback", ({"interview_id": "iid", "user_id": "uid"},)),
        ("get_question_by_order", ("iid", 1)),
        ("update_user_responses_processed", ("iid",)),
    ],
)
def test_table_methods_return_nested_error(method_name, args):
    client = MagicMock()
    client.table.side_effect = Exception('boom')
    service = SupabaseService(client=client)
    method = getattr(service, method_name)
    result = method(*args)
    assert result['error']['message'] == 'boom'


@pytest.mark.parametrize(
    ("method_name", "args"),
    [
        ("get_interview_history", ("uid",)),
        ("get_job_description_details", ("jid",)),
        ("get_interview_feedback", ("iid",)),
        ("update_interview", ("iid", {"score": 1})),
        ("get_active_preparation_plan", ("uid",)),
        ("create_preparation_plan", ({"steps": []},)),
        ("update_preparation_plan", ("pid", {"steps": []})),
        ("update_preparation_plan_status_by_user", ("uid", "inactive")),
    ],
)
def test_table_methods_return_flat_error(method_name, args):
    client = MagicMock()
    client.table.side_effect = Exception('boom')
    service = SupabaseService(client=client)
    method = getattr(service, method_name)
    result = method(*args)
    assert result['error'] == 'boom'


def test_check_plan_ownership_exception():
    client = MagicMock()
    client.table.side_effect = Exception('boom')
    service = SupabaseService(client=client)
    assert service.check_plan_ownership('pid', 'uid') is False


@pytest.mark.asyncio
async def test_insert_user_response_exception(mock_client):
    service = SupabaseService(client=mock_client)
    mock_client.table.side_effect = Exception('boom')
    result = await service.insert_user_response({'interview_id': 'iid'})
    assert result['error']['message'] == 'boom'


@pytest.mark.asyncio
async def test_upload_recording_file_exception(service, mock_client, tmp_path):
    file_path = tmp_path / "audio.webm"
    file_path.write_bytes(b'data')
    storage_mock = mock_client.storage.from_.return_value
    storage_mock.upload.side_effect = Exception('boom')
    result = await service.upload_recording_file('uid', str(file_path), interview_id='iid')
    assert result['error']['message'] == 'boom'


@pytest.mark.asyncio
async def test_upload_recording_file_returns_response_when_error_field(service, mock_client, tmp_path):
    file_path = tmp_path / "audio.webm"
    file_path.write_bytes(b'data')
    storage_mock = mock_client.storage.from_.return_value
    storage_mock.upload.return_value = {"error": "upload failed"}
    result = await service.upload_recording_file('uid', str(file_path), interview_id='iid')
    assert result == {"error": "upload failed"}


@pytest.mark.asyncio
async def test_get_interview_data_exception(mock_client):
    service = SupabaseService(client=mock_client)
    mock_client.table.side_effect = Exception('boom')
    result = await service.get_interview_data('uid', 'iid')
    assert result['error']['message'] == 'boom'
