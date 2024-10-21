import React, { useEffect, useState } from 'react';
import OrderList from './OrderList';
import './Order.css';
import Search from "../Search/Search";
import { fetchGetOrders, fetchDeleteOrder } from "../../../api/AdminUtils";
import { useNavigate } from "react-router-dom";

function AdminOrder() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [email, setEmail] = useState('');


    useEffect(() => {
        window.feather.replace();
    }, []);

    useEffect(() => {

        const fetchData = async () => {
            try {
                const data = await fetchGetOrders(currentPage, 5, 'createdAt', 'desc', email);
                setOrders(data.content);
                setTotalPages(data.totalPages);
            } catch (error) {
                alert(error.message);
                navigate('/admin');
            }
        };

        fetchData();
    }, [currentPage, email, navigate]);

    const handleDelete = async (deletedOrderId) => {
        const confirmed = window.confirm('이 주문을 삭제하시겠습니까?');
        if (!confirmed) return;

        try {
            await fetchDeleteOrder(deletedOrderId);
            alert('삭제되었습니다.');

            setOrders(prevOrders => {
                const updatedOrders = prevOrders.filter(order => order.id !== deletedOrderId);

                // 삭제 후 현재 페이지의 주문 수가 0이면 이전 페이지로 이동
                if (updatedOrders.length === 0 && currentPage > 0) {
                    setCurrentPage(prev => prev - 1);
                    return updatedOrders; // 주문 리스트를 업데이트 하지 않고 반환
                }

                // 현재 페이지에서 주문 수가 5개 미만인 경우
                if (updatedOrders.length < 5) {
                    // 다음 페이지의 주문 데이터를 가져옵니다.
                    if (currentPage < totalPages - 1) {
                        fetchGetOrders(currentPage + 1, 5, 'createdAt', 'desc', email)
                            .then(data => {
                                const remainingSpace = 5 - updatedOrders.length;
                                const newOrders = data.content.slice(0, remainingSpace); // 필요한 수만큼 잘라서 추가
                                setOrders([...updatedOrders, ...newOrders]);
                                setTotalPages(data.totalPages);
                            })
                            .catch(error => {
                                alert(error.message);
                            });
                        return updatedOrders; // 기존의 주문 리스트를 반환
                    }

                    // 주문 수를 유지하기 위해 빈 객체로 채우기
                    const fillItems = Array(5 - updatedOrders.length).fill({ id: null, item: '', quantity: 0, createdAt: null }); // 더미 객체
                    return [...updatedOrders, ...fillItems];
                }

                return updatedOrders; // 업데이트된 주문 리스트 반환
            });
        } catch (error) {
            alert(error.message);
        }
    };




    return (
        <div className=" card mt-5 p-4 border rounded shadow-sm" style={{ maxWidth: '960px' }}>
            <h2 className="text-center mb-4">주문 관리</h2>
            <div className="admin-order-content">
                <Search setEmail={setEmail}/>
                <OrderList orders={orders} onDelete={handleDelete}/>
            </div>

            <div className="admin-order-pagination">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))} disabled={currentPage === 0}>
                    <i data-feather="arrow-left"
                       style={{width: '14px', height: '14px', marginTop: '-4px', marginRight: '3px'}}></i>
                </button>
                <span>{currentPage + 1} / {totalPages}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1))}
                        disabled={currentPage === totalPages - 1}>
                    <i data-feather="arrow-right"
                       style={{width: '14px', height: '14px', marginTop: '-4px', marginLeft: '3px'}}></i>
                </button>
            </div>
        </div>
    );
}

export default AdminOrder;
