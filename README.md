# Code Challange

Xin chào reviewer. Tôi là Kai và tôi sẽ dùng tài liệu này để làm intruction cũng như nói một vài suy nghĩ của tôi liên quan đến code challange. Trong tài liệu này tôi sẽ đi qua từng vấn đề, đưa ra góc nhìn của tôi, cũng như hướng dẫn step by step để bạn có thể review cũng như run được các application.

Cũng như đề thì có mentioned đến, hiện tại AI đã có thể giúp chúng ta làm rất nhiều thứ. Nó thực sự impact rất lớn đến cách mà chúng ta làm việc trong việc xây dựng các ứng dụng. Tôi cũng không phủ nhận việc mình sử dụng AI để làm bài code chanllange này. Tuy nhiên tôi thấy điều quan trọng nhất theo tôi nghĩ đó là việc "thực sự biết mình đang làm gì?". Áp dụng vào các problems, nó được thể hiện như sau:

### Problem4

Tôi hiểu được và luôn suy nghĩ cũng như áp dụng nó khá nhiều vào thực tế. Đó là, đứng trước một bài toàn, một vấn đề cho dù là phức tạp nhiều hay ít, khi muốn tìm ra phương án giải quyết thì câu hỏi đầu tiên tôi nghĩ đến là: "Liệu có thể làm đưa vấn đề này thành một thứ đơn giản hơn hay không?" Thay vì chỉ nghĩ theo lối mòn, hãy thử suy nghĩ rộng hơn để tìm ra phương án đơn giản, hiểu quả hơn.
Về phương án giải quyết problem này, cách để làm nó đơn giản hơn là sử dụng công thức toán Gauss's Formula ở bậc trung học để tính tổng dãy số, bạn có thể quick check file readme ở `src/problem4/README.md` ngay lúc này luôn, sau đó hay quay trở lại tài liệu này và chúng ta sẽ đi đến problem tiếp theo

### Problem5

Đây là một vấn đề khá mở. Là một senior tôi hiểu giải quyết 1 vấn đề không chỉ đơn giản là làm cho nó chạy được. Trong problem này, khi tôi xây dựng giải pháp/application, tôi đã tập trung vào các vấn đề:

> (chỗ này hãy nói ngắn gọn từng phần chúng ta đã làm gì, nhưng chỉ nêu cực ngắn gọn thôi vì chúng ta đã nói chi tiết trong file plan rồi)

- `Security`:
- `Performance`:
- `Extendability`
- `Availability & Scalability`: có care đến việc production chạy k8s nên ở phía local tôi đang sử dụng docker base. Ban đầu tôi định dùng `Tilt` để xây dựng dev local với k8s nhưng
sau đó tôi nghĩ như thế sẽ không thuận tiện cho reviewer vì họ cần phải có kubernets trên local để chạy. Tôi đã sử dụng giải pháp đơn giản hơn là docker compose.
- `Observability`
- `Testability`
- `Developer Experience`

 Tôi biết chính xác mình đang làm gì, nếu có vấn đề xảy ra thì tôi hiểu được bản chất và biết nên improve ở đâu, fix ở đâu, ở layer nào. Thay vì một số lúc, một số người chỉ fix để nó chạy được, tôi sẽ tập trung vào rootcause. Để làm được điều đó, tôi đã không ngừng nỗ lực học hỏi, trau dồi kiến thức không những chỉ ở tầng application mà còn ở các tầng sâu hơn, ví dụ như tìm hiểu sâu hơn các ngôn ngữ (js, java, python, c#), compare các principle của các ngôn ngữ. Hiểu rõ các điểm mạnh của các framework của các ngôn ngữ này và áp dụng hợp lý để xử lý các vấn đề. Tôi cũng hiểu, với các hệ thống lớn, bên cạnh develop application, infrastructure cũng là thứ quan trọng không kém. Do đó, tôi đã tìm hiểu và lấy được các chứng chỉ quan trọng như AWS, Harness, Kubernetes, Terraform... Những điều này, giúp tôi có thể có 1 góc nhìn rộng và xuyên suốt hơn khi development.
Quay lại với problem này, để tránh việc mất tập trung, sau khi follow xong intruction này,bạn có thể dành 1 chút thời gian để xem chi tiết file plan ở đây `plans/260110-problem5-expressjs-crud-backend.md`.

Vì để không làm phần instruction này quá dài dòng, tối sẽ pick 1 tiêu chí mà tôi nghĩ mọi người hay bỏ qua hoặc xem nhẹ trong các tiêu chí trên để nói một vài suy nghĩ của tôi. Đó là `Observability` (các tiêu chí khác bạn có thể xem chi tiết trong file plan)

#### Observability

Vấn đề này đôi khi được xem nhẹ, thông thường mọi người chỉ nghĩ đến việc application có log là đủ rồi. Nhưng hãy thử tưởng tượng, bạn đang xây dựng 1 backend applicaiton phục vụ hàng chục triệu user, có hàng trăm transaction mỗi giây. Và bỗng nhiên, có 1 request nào đó trong hàng chục triệu requests đó không như expectation. Huống hồ, trong thực tế, development team không phải là team sẽ support khác hàng, không phải là bộ phận monitor hệ thống. Lúc này, việc chúng ta có những quy tắc, những chiến thuật hợp lý trong việc Observability sẽ giúp ích rất nhiều. Tôi có thể kể đến một số điểm nhỏ nhưng dễ bị bỏ qua như:
1. Hệ thống có 1 trace id xuyên suốt, như cách tôi đang áp dụng việc sử dụng `X-Correlation-ID` từ kong layer và xem nó là 1 trong những context khi log. Điều đó giúp chúng ta có thể query log với các hệ thống như splunk, opensearch... để lấy chính xác log của flow
2. Việc tổ chức trong code mỗi một request qua 1 layer nếu có lỗi xảy ra thì sẽ được tập trung xử lý ở 1 nơi DUY NHẤT. Các layer như service, repository, controller chỉ throw error, chỉ có DUY NHẤT 1 log error cho 1 request lỗi. Đảm bảo tính nhất quán, ....(chỗ này bổ sung thêm giúp tôi)
3. Việc định nghĩa rõ ràng Error cho từng tầng, ví dụ với layer repository là DataAccessError, layer service là BusinessError với internal message giúp các BAU/SRE có thể thuận tiện trong việc hiểu hành vi của application
Khi chúng ta đã có những quy tắc, nền tẳng vững chắc, thì việc mở rộng hay tận dụng nhưng công cụ AI, analysis để phân tích hệ thống là 1 điều dễ dàng. Hãy tưởng tượng việc sử dụng 1 LLM model để tự query log, đọc error, đọc context từ source code để có thể đưa ra được rootcause chỉ mấy vài giây nếu hệ thống gặp lỗi. Sẽ giúp ích rất nhiều.


Còn rất nhiều điều mà tôi muốn nói tiếp ở đây, tuy nhiên, để giữ cho file này không mất hàng tiếng đồng hồ và dài hàng nghìn dòng, tôi sẽ dừng lại ở đây và đi tiếp vào phần tiếp theo hướng dẫn cho bạn cách run problem 5. 
Tôi đã chuẩn bị 1 all in one command để bạn có thể chỉ run 1 lần duy nhất và làm được tất cả mọi thứ liên quan.
> Chỗ này bạn hãy dựa vào script `src/problem5/scripts/run-all.sh` để viết tiếp đoạn này nhé. Mục đích là để giới thiệu script đó làm gì và guide cho reviewer cách chạy.


## problem 6
Có khá nhiều thứ về phần architect cần phải làm rõ trong problem này. Bạn hãy đọc tài liệu này nhé `src/problem6/README.md`. Detail plan có thể đọc ở đây `plans/260111-problem6-scoreboard-module.md`