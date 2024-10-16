import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function FindAccount() {
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    const handleFindAccount = async (event) => {
        event.preventDefault();

        // 필수 입력 사항 체크
        if (!name || !phoneNumber) {
            setErrorMessage('이름과 전화번호를 입력해주세요.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/api/user/find?name=${name}&phoneNumber=${phoneNumber}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });


            if (response.ok) {
                const email = await response.text(); // 서버에서 이메일 반환
                navigate('/found', { state: { email } }); // 이메일을 다음 페이지로 전달
            } else if (response.status === 404) {
                setErrorMessage('계정을 찾을 수 없습니다.');
            } else {
                setErrorMessage('계정 찾기에 실패했습니다. 다시 시도해주세요.');
            }
        } catch (error) {
            setErrorMessage('계정 찾기에 실패했습니다. 서버와 통신에 문제가 있습니다.');
        }
    };

    const handleBack = () => {
        navigate(-1); // 이전 페이지로 돌아가기
    };

    return (
        <div className="user-container h-100 d-flex justify-content-center align-items-center">
            <div className="col-md-6">
                <div className="d-flex justify-content-between align-items-center">
                    <h3 className="text-left mb-2">계정 찾기</h3>
                    <div className="user-link">
                        <a href="#" onClick={handleBack} className="text-muted">뒤로가기</a>
                    </div>
                </div>
                <hr/>
                <form onSubmit={handleFindAccount}>
                    <div className="form-group mb-3">
                        <label htmlFor="name">이름</label>
                        <input
                            type="text"
                            className="form-control user-form-control"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group mb-3">
                        <label htmlFor="phoneNumber">전화번호</label>
                        <input
                            type="tel"
                            className="form-control user-form-control"
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                            style={{ marginBottom: '40px' }}
                        />
                    </div>
                    {errorMessage && <p className="text-danger">{errorMessage}</p>}
                    <button type="submit" className="btn btn-sm user-btn btn-dark">계정 찾기</button>
                </form>
            </div>
        </div>
    );
}

export default FindAccount;